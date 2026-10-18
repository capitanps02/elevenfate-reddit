import {deflateSync,inflateSync} from 'node:zlib';
import {serializeDailyRun,hydrateDailyArchive} from './daily-archive.mjs';
import {newDailyRun,applyDailyCommand,dailyRunView,dailyScore,DAILY_POSITIONS} from './daily-run.mjs';
export {dailyScore} from './daily-run.mjs';
import {createCareerService,CareerError} from './career-service.mjs';

export function dailyConfig(now=new Date(),version){
  const day=now.toISOString().slice(0,10),rulesVersion=version??(day>='2026-10-08'?7:day>='2026-10-07'?6:day>='2026-10-06'?5:day>='2026-10-05'?4:3),id=`daily-v${rulesVersion}:${day}`;
  let seed=2166136261;
  for(const char of id)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  return {id,day,seed,decisions:30,rulesVersion,resetsAt:new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString()};
}
function projected(config,run,mode='daily',seasonId){
  if(!run)return {config,mode,started:false};
  return {config,mode,started:true,resolved:run.resolved,finished:run.finished,view:dailyRunView(run,seasonId),score:run.finished?dailyScore(run.state,run):null};
}
function load(raw){
 const incompatible=()=>new CareerError(500,'No se pudo leer el Daily. El intento se conserva.');
 let run;try{run=hydrateDailyArchive(JSON.parse(raw));}catch{throw incompatible();}
 if(!run||![3,4,5,6,7].includes(run.version)||!Number.isInteger(run.resolved)||run.resolved<0||run.resolved>30||!run.state||!Array.isArray(run.summaries))throw incompatible();
 if(run.version>=5&&(!Array.isArray(run.cups)||!Array.isArray(run.competitions)||!run.narrative||!Number.isFinite(run.narrative.family)||!Array.isArray(run.narrative.promises)||!Array.isArray(run.narrative.callbacks)||!Array.isArray(run.narrative.choices)))throw incompatible();
 if(run.version===7&&(!DAILY_POSITIONS.includes(run.state.sport?.positionIdentity)||run.competitions.some(season=>season.sportsVersion!==4)))throw incompatible();
 if(run.recognitionVersion!==undefined&&(run.version!==7||run.recognitionVersion!==1))throw incompatible();
 return run;
}
// Namespace each day separately; reuse the tested save protocol, never the career key.
export function createDailyService({redis,now=()=>new Date()}){
  function store(config,mode){
    const key=k=>`${mode==='practice'?'practice:':''}${config.id}:${k}`;
    const retentionDays=mode==='practice'&&config.rulesVersion>=5?1:7;
    const expiration=new Date(Date.parse(config.resetsAt)+retentionDays*86400000);
    const scoped={get:async k=>{const raw=await redis.get(key(k));if(!raw||!raw.startsWith('z1:'))return raw;try{return inflateSync(Buffer.from(raw.slice(3),'base64'),{maxOutputLength:4_000_000}).toString('utf8');}catch{throw new CareerError(500,'No se pudo leer el Daily. El intento se conserva.');}},watch:async k=>{
      const transaction=await redis.watch(key(k));
      return {multi:()=>transaction.multi(),set:(k,v)=>transaction.set(key(k),'z1:'+deflateSync(Buffer.from(v)).toString('base64'),{expiration}),exec:()=>transaction.exec(),discard:()=>transaction.discard()};
    }};
    // Only server-owned Daily runs are persisted. Client snapshots are never read.
    return createCareerService({redis:scoped,validate:async()=>{},keepPrevious:false,maxSaveBytes:2_000_000});
  }
  async function currentAttempt(userId,mode){
    const moment=now(),config=dailyConfig(moment),record=await store(config,mode).read(userId);
    if(config.rulesVersion>=4&&!record.active){
      // An upgrade can land after midnight or review. Never grant a second attempt
      // to somebody who already started today's challenge under the old rules.
      for(let version=config.rulesVersion-1;version>=3;version--){const legacy=dailyConfig(moment,version),previous=await store(legacy,mode).read(userId);if(previous.active)return {config:legacy,record:previous};}
    }
    return {config,record};
  }
  return {
    async read(userId,mode='daily',seasonId){
      if(!['daily','practice'].includes(mode))throw new CareerError(400,'Modo Daily inválido.');
      const {config,record}=await currentAttempt(userId,mode);
      const session=record.active?load(record.active):null,result=projected(config,session,mode,seasonId);
      if(mode==='daily'){if(result.finished)await registerScore(config,userId,result.score.total);result.leaderboard=await leaderboard(config,userId);}
      return result;
    },
    async act(userId,body={}){
      if(!body||typeof body!=='object'||Array.isArray(body))throw new CareerError(400,'Acción Daily inválida.');
      const mode=body.mode??'daily';
      if(!['daily','practice'].includes(mode))throw new CareerError(400,'Modo Daily inválido.');
      const {config,record}=await currentAttempt(userId,mode);
      if(body.dailyId!==config.id)throw new CareerError(409,'Ha comenzado un nuevo Daily. Abre el reto de hoy.');
      const saves=store(config,mode);
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
        session=newDailyRun(mode==='practice'&&config.rulesVersion>=4?{...config,seed:(config.seed^0xa5a5a5a5^(record.generation*2654435761))>>>0}:config);
      }else{
        if(body.action!=='command')throw new CareerError(400,'Acción Daily inválida.');
        if(!record.active)throw new CareerError(400,'Empieza el reto antes de elegir.');
        session=load(record.active);
        const command=body.command;
        applyDailyCommand(session,command);

      }
      await saves.write(userId,{raw:serializeDailyRun(session),expectedGeneration:record.generation});
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
    // Scores are immutable once a competitive attempt finishes. Cardinality brackets
    // detect new finishes; retry a bounded number of times during concurrent joins.
    for(let attempt=0;attempt<4;attempt++){
      const before=await redis.zCard(key);
      const [top,rank,score]=await Promise.all([redis.zRange(key,0,24,{by:'rank',reverse:true}),redis.zRank(key,userId),redis.zScore(key,userId)]);
      const total=await redis.zCard(key);
      if(total!==before||top.length!==Math.min(25,total))continue;
      const own=top.findIndex(row=>row.member===userId),position=typeof rank==='number'?total-rank:null;
      if(own>=0&&position!==own+1)continue;
      return {total,position,score:typeof score==='number'?score:null,limit:25,rows:top.map((row,index)=>({position:index+1,score:row.score,you:row.member===userId}))};
    }
    throw new CareerError(503,'La clasificación está actualizándose. Tu intento está guardado; recupera el resultado en unos segundos.');
  }
}
