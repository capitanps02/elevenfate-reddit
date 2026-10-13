// Server-side isolated adapter. Never imports gameplay or accesses career keys.
import {decodeDiagnosticBatch,decideDiagnosticAdmission,MAX_WIRE_BYTES} from './diagnostic-wire.mjs';
const MAX=Number.MAX_SAFE_INTEGER,DAY=86_400_000;
const uint=x=>Number.isSafeInteger(x)&&x>=0;
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(x);
const bytes=x=>new TextEncoder().encode(x).byteLength;
const reply=(status,result)=>Object.freeze({status,result});
const empty=()=>({v:1,generation:0,allowed:false,session:null,expiresAt:0,day:0,dayBytes:0,receipt:null,counts:Array(8).fill(0),samples:0});
function readState(raw) {
  if(raw===undefined||raw===null)return empty();
  if(typeof raw!=='string'||raw.length>40_960||bytes(raw)>40_960)throw Error('storage');
  const s=JSON.parse(raw);
  if(s.v!==1||!uint(s.generation)||typeof s.allowed!=='boolean'||!(s.session===null||token(s.session))||!uint(s.expiresAt)||!uint(s.day)||!uint(s.dayBytes)||s.dayBytes>524_288||!uint(s.samples)||!Array.isArray(s.counts)||s.counts.length!==8||!s.counts.every(uint)||s.allowed&&s.session===null)throw Error('storage');
  if(s.receipt!==null){const r=s.receipt;if(!r||r.session!==s.session||r.generation!==s.generation||!token(r.batchId)||!uint(r.lastSeq)||r.lastSeq===0||typeof r.lastAt!=='number'||!Number.isFinite(r.lastAt)||r.lastAt<0||r.lastAt>MAX||typeof r.wire!=='string'||bytes(r.wire)>MAX_WIRE_BYTES)throw Error('storage');}
  return s;
}
const OFF=Object.freeze({receive:async()=>reply(403,'disabled'),configure:async()=>reply(403,'disabled')});
export function createDiagnosticStore(options={}) {
  if(options.enabled!==true)return OFF;
  const {redis,now=Date.now}=options;
  function key(subject) {if(!token(subject))throw Error('identity');return `telemetry:diag:v1:${subject}`;}
  async function transact(subject,change) {
    let txn,finished=false;
    try {
      const k=key(subject);txn=await redis.watch(k);
      // Current project adapter reads through redis after WATCH, not TxClient.get.
      const state=readState(await redis.get(k));const t=now();
      if(!uint(t)||Math.floor(t/DAY)<state.day)throw Error('clock');
      const outcome=change(state,t);
      if(!outcome.write){await txn.discard();finished=true;return outcome.response;}
      const raw=JSON.stringify(outcome.write);if(bytes(raw)>40_960)throw Error('storage');
      await txn.multi();await txn.set(k,raw);
      const result=await txn.exec();finished=true;
      // No positive acknowledgement for an aborted or uncertain commit.
      if(!Array.isArray(result)||result.length!==1||result[0]===null||result[0]===undefined)return reply(503,'retry');
      return outcome.response;
    }catch{return reply(503,'retry');}
    finally{if(txn&&!finished)try{await txn.discard();}catch{}}
  }
  return Object.freeze({
    // Internal trusted permission adapter only; not a public endpoint or consent flow.
    configure(subject,{expectedGeneration,allowed,session=null,expiresAt=0}={}) {
      if(!uint(expectedGeneration)||typeof allowed!=='boolean'||allowed&&(!token(session)||!uint(expiresAt)))return Promise.resolve(reply(400,'invalid'));
      return transact(subject,(s,t)=>{
        if(s.generation!==expectedGeneration||s.generation===MAX)return {response:reply(409,'generation')};
        if(allowed&&(expiresAt<=t||expiresAt>t+1_800_000))return {response:reply(400,'lease')};
        const day=Math.floor(t/DAY);
        const next={...s,generation:s.generation+1,allowed,session:allowed?session:null,expiresAt:allowed?expiresAt:0,day,dayBytes:day===s.day?s.dayBytes:0,receipt:null,counts:allowed&&s.allowed?[...s.counts]:Array(8).fill(0),samples:allowed&&s.allowed?s.samples:0};
        return {write:next,response:Object.freeze({status:200,result:allowed?'configured':'revoked',generation:next.generation})};
      });
    },
    receive(subject,text) {
      if(typeof text!=='string'||text.length>MAX_WIRE_BYTES)return Promise.resolve(reply(413,'size'));
      const receivedBytes=bytes(text);
      if(receivedBytes>MAX_WIRE_BYTES)return Promise.resolve(reply(413,'size'));
      return transact(subject,(s,t)=>{
        if(!s.allowed||t>=s.expiresAt)return {response:reply(403,'disabled')};
        const day=Math.floor(t/DAY),spent=day===s.day?s.dayBytes:0;
        if(spent+receivedBytes>524_288)return {response:reply(429,'quota')};
        // The byte quota counts permitted-context invalid requests and duplicates too.
        const next={...s,day,dayBytes:spent+receivedBytes};
        const decoded=decodeDiagnosticBatch(text,{allowed:s.allowed,session:s.session,generation:s.generation,now:t,expiresAt:s.expiresAt});
        const decision=decideDiagnosticAdmission(s.receipt,decoded);
        if(decision.status==='rejected')return {write:next,response:reply(decoded.reason==='permission'?403:decoded.ok?409:400,decision.reason)};
        if(decision.status==='accepted'){
          next.receipt=decision.state;next.counts=[...s.counts];
          for(const r of decoded.batch.records)next.counts[r.code-1]=Math.min(MAX,next.counts[r.code-1]+1);
          next.samples=Math.min(MAX,s.samples+decoded.batch.records.length);
        }
        return {write:next,response:Object.freeze({status:200,result:decision.status,batchId:decoded.batch.batchId})};
      });
    },
  });
}
