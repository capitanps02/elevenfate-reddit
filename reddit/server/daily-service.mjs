import {GameSession} from '../../dist/session/game-session.js';
import {createCareerService,CareerError} from './career-service.mjs';

export function dailyConfig(now=new Date()){
  const day=now.toISOString().slice(0,10),id=`daily-v1:${day}`;
  let seed=2166136261;
  for(const char of id)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  return {id,day,seed,decisions:5,rulesVersion:1,resetsAt:new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString()};
}
export function dailyScore(state){
  const clamp=n=>Math.max(0,Math.min(100,Number.isFinite(n)?n:0));
  const parts=[['Forma',state.sport.form,30],['Papel deportivo',state.sport.roleScore,25],['Estado físico',state.body.fitness,20],['Profesionalidad',state.personality.professionalism,15],['Control de carrera',state.control.career,10]];
  const breakdown=parts.map(([label,value,weight])=>({label,value:clamp(value),weight,points:Math.round(clamp(value)*weight/10)}));
  return {total:breakdown.reduce((sum,part)=>sum+part.points,0),breakdown};
}
async function reachPlayable(session){
  for(let i=0;i<20&&session.getView().screen==='career';i++){
    const view=session.getView();
    await session.dispatch({type:'continue',maxDays:60,commandId:`daily-auto-${view.revision}`,expectedRevision:view.revision});
  }
  if(session.getView().screen==='career')throw new CareerError(503,'No se pudo preparar la siguiente decisión. Tu intento se conserva.');
}
function projected(config,session){
  if(!session)return {config,started:false};
  const snapshot=session.exportSnapshot(),view=session.getView();
  const resolved=snapshot.journal.length,finished=resolved>=config.decisions||view.screen==='epilogue';
  return {config,started:true,resolved,finished,view,score:finished?dailyScore(snapshot.state):null};
}
// Namespace each day separately; reuse the tested save protocol, never the career key.
export function createDailyService({redis,now=()=>new Date()}){
  function store(config){
    const key=k=>`${config.id}:${k}`;
    const scoped={get:k=>redis.get(key(k)),watch:async k=>{
      const transaction=await redis.watch(key(k));
      return {multi:()=>transaction.multi(),set:(k,v)=>transaction.set(key(k),v),exec:()=>transaction.exec(),discard:()=>transaction.discard()};
    }};
    return createCareerService({redis:scoped,validate:raw=>GameSession.migrateFromSave(raw)});
  }
  return {
    async read(userId){
      const config=dailyConfig(now()),record=await store(config).read(userId);
      return projected(config,record.active?await GameSession.migrateFromSave(record.active):null);
    },
    async act(userId,body={}){
      const config=dailyConfig(now());
      if(body.dailyId!==config.id)throw new CareerError(409,'Ha comenzado un nuevo Daily. Abre el reto de hoy.');
      const saves=store(config),record=await saves.read(userId);
      let session;
      if(body.action==='start'){
        if(record.active)return projected(config,await GameSession.migrateFromSave(record.active));
        session=await GameSession.create(config.seed,{sessionId:config.id});
        await reachPlayable(session);
      }else{
        if(!record.active)throw new CareerError(400,'Empieza el reto antes de elegir.');
        session=await GameSession.migrateFromSave(record.active);
        const current=projected(config,session),command=body.command;
        if(current.finished)throw new CareerError(409,'Ya has terminado el Daily de hoy.');
        if(!command||!['choose','acknowledge','offer'].includes(command.type)||typeof command.commandId!=='string'||command.commandId.length>100)throw new CareerError(400,'Acción Daily inválida.');
        // Whitelist fields: clients cannot send scores, snapshots or simulation commands.
        const safe={type:command.type,commandId:command.commandId,expectedRevision:command.expectedRevision};
        if(command.type==='choose')Object.assign(safe,{pendingInstanceId:command.pendingInstanceId,choiceId:command.choiceId});
        if(command.type==='offer')Object.assign(safe,{offerId:command.offerId,action:command.action});
        try{await session.dispatch(safe);}catch(error){throw new CareerError(error.code==='STALE_REVISION'?409:400,error.message);}
        await reachPlayable(session);
      }
      await saves.write(userId,{raw:JSON.stringify(session.exportSnapshot()),expectedGeneration:record.generation});
      return projected(config,session);
    },
  };
}
