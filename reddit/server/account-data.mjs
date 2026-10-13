import {randomUUID} from 'node:crypto';
import {CareerError} from './career-service.mjs';

const accountKey=id=>{
  if(typeof id!=='string'||!/^t2_[a-z0-9]+$/i.test(id))throw new CareerError(401,'Inicia sesión en Reddit.');
  return `account:v1:${id}`;
};
const conflict=()=>new CareerError(409,'Esta sesión ha caducado o tus datos han sido eliminados. Vuelve a abrir el juego.');
const committed=result=>Array.isArray(result)&&result.length>0&&result.every(value=>value!==null);

// Redis has no global key scan. Cover all unindexed legacy versions within their
// maximum TTL (including rankings written on the last day), then use the index.
export function legacyAccountKeys(id,now=new Date()){
  const keys=[`career:v1:${id}`,`analytics:v2:user:${id}`],rankings=[];
  for(let offset=0;offset<=9;offset++){
    const day=new Date(Date.parse(now.toISOString().slice(0,10)+'T00:00:00Z')-offset*86400000).toISOString().slice(0,10);
    for(let version=3;version<=7;version++){
      const prefix=`daily-v${version}:${day}`;
      keys.push(`${prefix}:career:v1:${id}`,`practice:${prefix}:career:v1:${id}`);
      rankings.push(`${prefix}:ranking`);
    }
  }
  return {keys,rankings};
}

export function createAccountData({redis,now=()=>new Date(),token=randomUUID}){
  const eligibilityKey=id=>`eligibility:v1:${id}`;
  async function blockedUntil(id){accountKey(id);const value=await redis.get(eligibilityKey(id));return value&&Date.parse(value)>now().getTime()?value:null;}
  async function record(id){const raw=await redis.get(accountKey(id));return raw?JSON.parse(raw):null;}
  async function assert(id,session){const current=await record(id);if(!current||!session||current.session!==session)throw conflict();return current;}
  async function open(id){
    const key=accountKey(id);
    for(let attempt=0;attempt<4;attempt++){
      const tx=await redis.watch(key);let done=false;
      try{
        const existing=await record(id);
        if(existing){await tx.discard();done=true;return existing.session;}
        const next={session:token(),keys:[],rankings:[]};
        await tx.multi();await tx.set(key,JSON.stringify(next));const result=await tx.exec();done=true;
        if(committed(result))return next.session;
      }finally{if(!done)await tx.discard();}
    }
    throw conflict();
  }
  function guarded(id,session){
    const gate=accountKey(id);
    return new Proxy(redis,{get(target,property){
      if(property==='watch')return async(...keys)=>{
        const tx=await redis.watch(gate,...keys);let current;
        try{current=await assert(id,session);}catch(error){await tx.discard();throw error;}
        const writes=new Set();
        return {
          multi:()=>tx.multi(),discard:()=>tx.discard(),
          set:async(key,value,options)=>{writes.add(key);return tx.set(key,value,options);},
          exec:async()=>{
            // Expired Daily keys need not accumulate forever in an account index.
            const cutoff=new Date(now().getTime()-9*86400000).toISOString().slice(0,10);
            current.keys=[...new Set([...current.keys,...writes])].filter(key=>!key.includes('daily-v')||(key.match(/\d{4}-\d{2}-\d{2}/)?.[0]??'')>=cutoff);
            await tx.set(gate,JSON.stringify(current));
            const result=await tx.exec();return committed(result)?result.slice(0,-1):[];
          },
        };
      };
      if(property==='zAdd')return async(key,...members)=>{
        if(members.some(row=>row.member!==id))throw new CareerError(400,'Identidad de clasificación inválida.');
        const tx=await redis.watch(gate);let done=false;
        try{
          const current=await assert(id,session);
          const cutoff=new Date(now().getTime()-9*86400000).toISOString().slice(0,10);
          current.rankings=[...new Set([...current.rankings,key])].filter(k=>(k.match(/\d{4}-\d{2}-\d{2}/)?.[0]??'')>=cutoff);
          await tx.multi();await tx.zAdd(key,...members);await tx.set(gate,JSON.stringify(current));
          const result=await tx.exec();done=true;if(!committed(result))throw conflict();return result[0];
        }finally{if(!done)await tx.discard();}
      };
      const value=target[property];return typeof value==='function'?value.bind(target):value;
    }});
  }
  async function inventory(id,session){
    const current=await assert(id,session),legacy=legacyAccountKeys(id,now());
    return {keys:[...new Set([...legacy.keys,...current.keys])],rankings:[...new Set([...legacy.rankings,...current.rankings])]};
  }
  async function exportData(id,session){
    const all=await inventory(id,session),records={},rankings={};
    await Promise.all(all.keys.map(async key=>{const value=await redis.get(key);if(value)records[key]=value;}));
    await Promise.all(all.rankings.map(async key=>{const score=await redis.zScore(key,id);if(typeof score==='number')rankings[key]=score;}));
    await assert(id,session);
    return {format:'elevenfate-account-v1',exportedAt:now().toISOString(),records,rankings};
  }
  async function remove(id,session){
    const gate=accountKey(id);
    for(let attempt=0;attempt<4;attempt++){
      const tx=await redis.watch(gate);let done=false;
      try{
        const current=await record(id);
        if(current&&current.session!==session)throw conflict();
        if(!current){await tx.discard();done=true;return {deleted:true};}
        if(!session)throw conflict();
        const legacy=legacyAccountKeys(id,now()),keys=[...new Set([...legacy.keys,...current.keys,gate])],rankings=[...new Set([...legacy.rankings,...current.rankings])];
        const resetsAt=new Date(Date.parse(now().toISOString().slice(0,10)+'T00:00:00Z')+86400000);
        await tx.multi();await tx.del(...keys);await tx.zRem('analytics:v2:subjects',[id]);
        await tx.set(eligibilityKey(id),resetsAt.toISOString(),{expiration:resetsAt});
        await Promise.all(rankings.map(key=>tx.zRem(key,[id])));
        const result=await tx.exec();done=true;
        if(committed(result))return {deleted:true};
      }finally{if(!done)await tx.discard();}
    }
    throw new CareerError(503,'Hay otra sesión escribiendo. Reintenta el borrado; no se ha confirmado.');
  }
  return {open,assert,guarded,exportData,remove,blockedUntil};
}
