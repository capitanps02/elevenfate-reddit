// Isolated sender policy: injected transport only, no production endpoint or listeners.
import {validDiagnostic} from './diagnostic-contract.mjs';
const MAX=Number.MAX_SAFE_INTEGER;
const OFF=Object.freeze({enabled:false,pump:()=>false,disable:()=>false,health:()=>Object.freeze({enabled:false,inFlight:false,attempts:0,bytesSent:0,nextAt:0})});
export function createDiagnosticSender(options={}) {
  if(options.mode!=='diagnostic')return OFF;
  const {core,send,now=()=>performance.now(),busy=()=>true,setTimer=setTimeout,clearTimer=clearTimeout,lease,sessionBudget=262_144}=options;
  if(!core||!lease||lease.allowed!==true||typeof lease.session!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(lease.session)||!Number.isSafeInteger(lease.generation)||lease.generation<0||!Number.isSafeInteger(lease.deadline)||lease.deadline<0||typeof send!=='function'||!Number.isSafeInteger(sessionBudget)||sessionBudget<0||sessionBudget>262_144)return OFF;
  // Copy configuration so external mutation cannot renew a revoked generation.
  const session=lease.session,generation=lease.generation,deadline=lease.deadline;
  let enabled=true,last=-1,nextAt=0,pending=null,wire=null,attempts=0,bytesSent=0,failures=0,limit=32,flight=null;
  const clearPending=()=>{pending=null;wire=null;attempts=0;};
  function disable() {
    if(!enabled)return false;
    enabled=false;clearPending();
    if(flight){flight.wire=null;try{clearTimer(flight.timer);}catch{}try{flight.controller.abort();}catch{}}
    try{core.disable();}catch{}
    return true;
  }
  function clock() {
    try{const t=now();if(typeof t!=='number'||!Number.isFinite(t)||t<0||t<last||t>MAX){disable();return null;}last=t;if(t>=deadline){disable();return null;}return t;}
    catch{disable();return null;}
  }
  function discard() {if(pending)core.discard(pending.batchId);clearPending();}
  function finish(f,response) {
    try{
      clearTimer(f.timer);
      if(!enabled||pending?.batchId!==f.batchId||!core.enabled)return;
      const t=clock();if(t===null)return;
      if(core.expire()){clearPending();return;}
      if(!f.timedOut&&response?.status>=200&&response.status<300&&response.batchId===pending.batchId&&(response.result==='accepted'||response.result==='duplicate')){
        if(core.ack(pending.batchId)){clearPending();failures=0;}return;
      }
      if(!f.timedOut&&(response?.status===401||response?.status===403||response?.result==='disabled')){disable();return;}
      if(!f.timedOut&&[400,409,410,413].includes(response?.status)){
        if(response.status===413)limit=Math.max(1,Math.floor(limit/2));
        discard();return;
      }
      if(!f.timedOut&&response?.status===429){
        const delay=response.retryAfterMs;
        if(typeof delay==='number'&&Number.isFinite(delay)&&delay>=0&&delay<=MAX-t)nextAt=Math.max(nextAt,t+delay);
      } else {
        failures++;
        if(failures>=3){nextAt=Math.max(nextAt,Math.min(MAX,t+600_000));failures=0;}
      }
      if(attempts>=3)discard();
    }catch{disable();}
    finally{f.wire=null;if(flight===f)flight=null;}
  }
  function pump() {
    if(!enabled)return false;
    try{
      if(!core.enabled){disable();return false;}
      const t=clock();if(t===null)return false;
      // Keep the batch in the ring while transport owns it, even after its TTL.
      // An abort request cannot free capacity before transport completion.
      if(flight)return false;
      if(core.expire())clearPending();
      if(t<nextAt||busy()!==false)return false;
      if(!pending){
        pending=core.freeze(session,limit);if(!pending)return false;
        if(pending.records.some(r=>!validDiagnostic(r.code,r.a,r.b,r.c))){disable();return false;}
        wire=JSON.stringify({schema:1,catalog:1,session,generation,batchId:pending.batchId,records:pending.records});
      }
      const bytes=new TextEncoder().encode(wire).byteLength;
      if(bytes>16_384){limit=Math.max(1,Math.floor(limit/2));discard();return false;}
      if(bytesSent+bytes>sessionBudget){disable();return false;}
      bytesSent+=bytes;attempts++;nextAt=Math.min(MAX,t+60_000);
      const f={batchId:pending.batchId,wire,controller:new AbortController(),timer:null,timedOut:false};flight=f;
      f.timer=setTimer(()=>{
        if(flight!==f||!enabled)return;
        f.timedOut=true;
        try{f.controller.abort();}catch{disable();}
        // Keep flight until the transport settles: abort does not prove completion.
      },3000);
      // Return synchronously; gameplay must never await this observer.
      Promise.resolve().then(()=>{
        if(!enabled||f.controller.signal.aborted)return null;
        return send(f.wire,{signal:f.controller.signal});
      }).then(response=>finish(f,response),()=>finish(f,null));
      return true;
    }catch{disable();return false;}
  }
  return Object.freeze({get enabled(){return enabled;},pump,disable,health:()=>Object.freeze({enabled,inFlight:flight!==null,attempts,bytesSent,nextAt})});
}
