import {newDailyRun,applyDailyCommand,dailyRunView,dailyScore} from './daily-run.mjs';
export {dailyScore} from './daily-run.mjs';
import {createCareerService,CareerError} from './career-service.mjs';

export function dailyConfig(now=new Date()){
  const day=now.toISOString().slice(0,10),id=`daily-v3:${day}`;
  let seed=2166136261;
  for(const char of id)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  return {id,day,seed,decisions:30,rulesVersion:3,resetsAt:new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString()};
}
function projected(config,run,mode='daily',seasonId){
  if(!run)return {config,mode,started:false};
  return {config,mode,started:true,resolved:run.resolved,finished:run.finished,view:dailyRunView(run,seasonId),score:run.finished?dailyScore(run.state,run):null};
}
function load(raw){const run=JSON.parse(raw);if(run.version!==3||!Number.isInteger(run.resolved)||run.resolved<0||run.resolved>30||!run.state||!Array.isArray(run.summaries))throw new CareerError(500,'No se pudo leer el Daily. El intento se conserva.');return run;}
// Namespace each day separately; reuse the tested save protocol, never the career key.
export function createDailyService({redis,now=()=>new Date()}){
  function store(config,mode){
    const key=k=>`${mode==='practice'?'practice:':''}${config.id}:${k}`;
    const expiration=new Date(Date.parse(config.resetsAt)+7*86400000);
    const scoped={get:k=>redis.get(key(k)),watch:async k=>{
      const transaction=await redis.watch(key(k));
      return {multi:()=>transaction.multi(),set:(k,v)=>transaction.set(key(k),v,{expiration}),exec:()=>transaction.exec(),discard:()=>transaction.discard()};
    }};
    // Only server-owned Daily runs are persisted. Client snapshots are never read.
    return createCareerService({redis:scoped,validate:async()=>{}});
  }
  return {
    async read(userId,mode='daily',seasonId){
      if(!['daily','practice'].includes(mode))throw new CareerError(400,'Modo Daily inválido.');
      const config=dailyConfig(now()),record=await store(config,mode).read(userId);
      const session=record.active?load(record.active):null,result=projected(config,session,mode,seasonId);
      if(mode==='daily'){if(result.finished)await registerScore(config,userId,result.score.total);result.leaderboard=await leaderboard(config,userId);}
      return result;
    },
    async act(userId,body={}){
      const config=dailyConfig(now());
      const mode=body.mode??'daily';
      if(!['daily','practice'].includes(mode))throw new CareerError(400,'Modo Daily inválido.');
      if(body.dailyId!==config.id)throw new CareerError(409,'Ha comenzado un nuevo Daily. Abre el reto de hoy.');
      const saves=store(config,mode),record=await saves.read(userId);
      let session;
      if(body.action==='publish'){
        if(mode==='practice'||!record.active)throw new CareerError(400,'Solo el Daily terminado entra en el ranking.');
        session=load(record.active);
        const result=projected(config,session,mode);
        if(!result.finished)throw new CareerError(400,'Termina las decisiones antes de publicar.');
        // Score and identity come exclusively from the confirmed server attempt.
        await registerScore(config,userId,result.score.total);
        result.leaderboard=await leaderboard(config,userId);
        return result;
      }
      if(body.action==='start'||body.action==='restart'){
        if(body.action==='restart'){
          if(mode!=='practice'||!record.active)throw new CareerError(400,'Solo puedes repetir una práctica terminada.');
          const previous=load(record.active);
          if(!previous.finished||previous.revision!==body.expectedRevision)throw new CareerError(409,'Recupera la práctica actual antes de repetirla.');
        }else if(record.active)return this.read(userId,mode);
        session=newDailyRun(config);
      }else{
        if(body.action!=='command')throw new CareerError(400,'Acción Daily inválida.');
        if(!record.active)throw new CareerError(400,'Empieza el reto antes de elegir.');
        session=load(record.active);
        const command=body.command;
        applyDailyCommand(session,command);

      }
      await saves.write(userId,{raw:JSON.stringify(session),expectedGeneration:record.generation});
      const result=projected(config,session,mode);
      if(mode==='daily'&&result.finished){await registerScore(config,userId,result.score.total);result.leaderboard=await leaderboard(config,userId);}
      return result;
    },
  };
  async function registerScore(config,userId,score){
    // Only after a confirmed run save; retries cannot create duplicate entries.
    await redis.zAdd(`${config.id}:ranking`,{member:userId,score});
    await redis.expire(`${config.id}:ranking`,8*86400);
  }
  async function leaderboard(config,userId){
    const key=`${config.id}:ranking`;
    const [top,total,rank,score]=await Promise.all([redis.zRange(key,0,24,{reverse:true}),redis.zCard(key),redis.zRank(key,userId),redis.zScore(key,userId)]);
    // No public identifiers/names: disclose only score, position and own-entry flag.
    return {total,position:typeof rank==='number'?total-rank:null,score:typeof score==='number'?score:null,limit:25,rows:top.map((row,index)=>({position:index+1,score:row.score,you:row.member===userId}))};
  }
}
