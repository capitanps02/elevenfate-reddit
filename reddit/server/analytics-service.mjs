import {randomUUID} from 'node:crypto';
import {CareerError} from './career-service.mjs';
import {validSnapshot} from '../analytics/contract.mjs';
import {summarize} from '../analytics/report.mjs';
export const ANALYTICS_INDEX='analytics:v2:subjects';
export const analyticsKey=id=>`analytics:v2:user:${id}`;
const ok=result=>Array.isArray(result)&&result.length>0&&result.every(v=>v!==null);
export function createAnalyticsService({redis,accounts,now=Date.now}){
 const day=()=>new Date(now()).toISOString().slice(0,10);
 const read=async id=>{const raw=await redis.get(analyticsKey(id));return raw?JSON.parse(raw):{allowed:false,generation:0,days:{}};};
 async function mutate(id,session,fn,bytes=0){
  const key=analyticsKey(id),gate=`account:v1:${id}`,quotaKey='analytics:v2:bytes:'+day(),tx=await redis.watch(gate,key,ANALYTICS_INDEX,quotaKey);let done=false;
  try{
   await accounts.assert(id,session);const installationBytes=Number(await redis.get(quotaKey)??0);if(!Number.isSafeInteger(installationBytes)||installationBytes+bytes>134217728)throw new CareerError(429,'Cuota diaria de la instalación.');const state=await read(id),result=fn(state);if(!result.write){await tx.discard();done=true;return result.response;}
   const cutoff=new Date(now()-89*86400000).toISOString().slice(0,10);for(const d of Object.keys(state.days))if(d<cutoff)delete state.days[d];
   if(state.allowed&&await redis.zScore(ANALYTICS_INDEX,id)===undefined&&(await redis.zRange(ANALYTICS_INDEX,now()-90*86400000,now(),{by:'score',limit:{offset:0,count:1000}})).length>=1000)throw new CareerError(429,'Límite de participantes de esta instalación.');
   const raw=JSON.stringify(state);if(Buffer.byteLength(raw)>256*1024)throw new CareerError(429,'Límite de almacenamiento analítico.');
   await tx.multi();if(bytes)await tx.set(quotaKey,String(installationBytes+bytes),{expiration:new Date(now()+2*86400000)});await tx.zRemRangeByScore(ANALYTICS_INDEX,0,now()-90*86400000);await tx.set(key,raw,{expiration:new Date(now()+90*86400000)});
   if(state.allowed)await tx.zAdd(ANALYTICS_INDEX,{member:id,score:now()});else await tx.zRem(ANALYTICS_INDEX,[id]);
   let resultTx;try{resultTx=await tx.exec();}catch{throw new CareerError(503,'Reintenta la operación analítica.');}done=true;if(!ok(resultTx))throw new CareerError(503,'Reintenta la operación analítica.');return result.response;
  }finally{if(!done)try{await tx.discard();}catch{}}
 }
 return {
  async preference(id,session){await accounts.assert(id,session);const s=await read(id);return {allowed:s.allowed,generation:s.generation};},
  configure:(id,session,allowed)=>mutate(id,session,s=>{if(typeof allowed!=='boolean')throw new CareerError(400,'Preferencia inválida.');s.allowed=allowed;s.generation++;s.days={};s.firstSeen=null;return {write:true,response:{allowed,generation:s.generation}};}),
  receive:(id,session,v,bytes)=>mutate(id,session,s=>{
   if(!s.allowed||s.generation!==v?.generation)throw new CareerError(403,'Analítica desactivada.');
   if(!validSnapshot(v))throw new CareerError(400,'Formato analítico inválido.');
   const today=day();if(v.day!==today)throw new CareerError(409,'Día analítico caducado.');const d=s.days[today]??={bytes:0,sessions:{}};
   if(d.bytes+bytes>524288)throw new CareerError(429,'Cuota diaria analítica alcanzada.');
   const old=d.sessions[v.session];
   if(!old&&Object.keys(d.sessions).length>=40)throw new CareerError(429,'Límite diario de sesiones.');
   if(old&&(v.revision<old.revision||v.activeMs<old.activeMs||v.visibleMs<old.visibleMs||Object.keys(v.events).some(k=>v.events[k]<old.events[k])||Object.keys(old.screens).some(k=>(v.screens[k]??0)<old.screens[k])||v.latency.some((x,i)=>x<old.latency[i])||(old.closed&&!v.closed)))throw new CareerError(409,'Checkpoint antiguo.');
   if(old&&v.revision===old.revision&&JSON.stringify(v)!==JSON.stringify(old))throw new CareerError(409,'Checkpoint alterado.');
   d.bytes+=bytes;d.sessions[v.session]=v;s.firstSeen??=today;
   return {write:true,response:{accepted:true,revision:v.revision}};
  },bytes),
  async probe(){
   const key='analytics:v2:probe:'+randomUUID(),expiration=new Date(now()+60000);let tx,done=false,stage='set',initial;
   try{
    await redis.set(key,'one',{expiration});stage='watch';tx=await redis.watch(key);stage='read';initial=await redis.get(key);stage='concurrent-write';await redis.set(key,'two',{expiration});stage='multi';await tx.multi();stage='queued-write';await tx.set(key,'three',{expiration});stage='exec';const result=await tx.exec();done=true;stage='read-after-exec';const observed=await redis.get(key);
    return {sdk:'0.14.7',read:initial==='one',conflictBlocked:!ok(result),preserved:observed==='two',passed:initial==='one'&&!ok(result)&&observed==='two',temporaryKeyExpiresInSeconds:60};
   }catch(error){if(stage==='exec'&&String(error.message).includes('redis: transaction failed')){done=true;const observed=await redis.get(key);return {passed:initial==='one'&&observed==='two',read:initial==='one',conflictBlocked:true,preserved:observed==='two',conflictReportedAs:'error',temporaryKeyExpiresInSeconds:60};}return {passed:false,stage,error:String(error.message).slice(0,240),temporaryKeyExpiresInSeconds:60};}
   finally{if(tx&&!done)try{await tx.discard();}catch{}}
  },
  async report(days=30){
   const rows=await redis.zRange(ANALYTICS_INDEX,now()-90*86400000,now(),{by:'score',limit:{offset:0,count:1001}}),records=[];
   // Bounded parallel reads; report work cannot exhaust transaction slots.
   for(let i=0;i<Math.min(rows.length,1000);i+=10){const batch=rows.slice(i,Math.min(i+10,1000));if(redis.mGet){const values=await redis.mGet(batch.map(row=>analyticsKey(row.member)));records.push(...values.map(raw=>raw?JSON.parse(raw):{allowed:false}));}else records.push(...await Promise.all(batch.map(row=>read(row.member))));}
   return summarize(records,{now:now(),days,truncated:rows.length>1000});
  },
 };
}
