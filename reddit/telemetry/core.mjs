// Isolated P2 prototype. No production entrypoint imports this module.
// Codes and numeric slots are a local capture contract, NOT a network schema.
export const CAPACITY = 256;
export const BEHAVIOR_CAPACITY = 192;
export const MAX_BATCH = 32;
export const BATCH_TTL_MS = 300_000;
const MAX = Number.MAX_SAFE_INTEGER;
const technical = code => Number.isInteger(code) && code >= 1 && code <= 8;
const behavioral = code => Number.isInteger(code) && code >= 32 && code <= 39;
const scalar = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= MAX;
const noop = () => false;
const OFF = Object.freeze({enabled:false,tryRecord:noop,freeze:()=>null,ack:noop,expire:noop,disable:noop,health:()=>Object.freeze({enabled:false,queued:0,inFlight:0,dropped:0,invalid:0,expired:0,typedBytes:0})});

export function createTelemetryCore({mode='off',now=()=>performance.now()}={}) {
  if(mode !== 'diagnostic' && mode !== 'behavior') return OFF;
  const codes=new Uint8Array(CAPACITY),seqs=new Float64Array(CAPACITY),times=new Float64Array(CAPACITY);
  const a=new Float64Array(CAPACITY),b=new Float64Array(CAPACITY),c=new Float64Array(CAPACITY);
  const typedBytes=codes.byteLength+seqs.byteLength+times.byteLength+a.byteLength+b.byteLength+c.byteLength;
  let enabled=true,head=0,count=0,behaviorCount=0,seq=0,last=-1,batch=null,created=0;
  let dropped=0,invalid=0,expired=0;
  const add=(n,delta=1)=>Math.min(MAX,n+delta);
  function disable() {
    enabled=false;head=0;count=0;behaviorCount=0;batch=null;
    codes.fill(0);seqs.fill(0);times.fill(0);a.fill(0);b.fill(0);c.fill(0);
    return true;
  }
  function clock() {
    try { const t=now();if(!scalar(t)||t<0||t<last) {disable();return null;} last=t;return t; }
    catch {disable();return null;}
  }
  function remove(n) {
    for(let i=0;i<n;i++) {
      if(behavioral(codes[head]))behaviorCount--;
      codes[head]=0;seqs[head]=0;times[head]=0;a[head]=0;b[head]=0;c[head]=0;
      head=(head+1)%CAPACITY;count--;
    }
  }
  const api={
    get enabled(){return enabled;},
    tryRecord(code,x=0,y=0,z=0) {
      if(!enabled)return false;
      const behavior=behavioral(code);
      if((!technical(code)&&!behavior)||!scalar(x)||!scalar(y)||!scalar(z)) {invalid=add(invalid);return false;}
      if(behavior&&mode!=='behavior')return false;
      // In-flight records remain in this ring: count is the GLOBAL record count.
      if(count===CAPACITY||(behavior&&behaviorCount===BEHAVIOR_CAPACITY)) {dropped=add(dropped);return false;}
      if(seq===MAX){disable();return false;}
      const t=clock();if(t===null)return false;
      const i=(head+count)%CAPACITY;
      codes[i]=code;seqs[i]=++seq;times[i]=t;a[i]=x;b[i]=y;c[i]=z;
      count++;if(behavior)behaviorCount++;
      return true;
    },
    freeze(batchPrefix) {
      if(!enabled)return null;
      // Returning the same object guarantees byte-stable serialization by a future adapter.
      if(batch)return batch;
      if(!count||typeof batchPrefix!=='string'||! /^[A-Za-z0-9_-]{1,40}$/.test(batchPrefix))return null;
      const t=clock();if(t===null)return null;
      const records=[];
      for(let j=0;j<Math.min(count,MAX_BATCH);j++) {
        const i=(head+j)%CAPACITY;
        records.push(Object.freeze({code:codes[i],seq:seqs[i],at:times[i],a:a[i],b:b[i],c:c[i]}));
      }
      // First seq never repeats within this core, even when the caller reuses its prefix.
      const batchId=`${batchPrefix}_${seqs[head]}`;
      created=t;batch=Object.freeze({batchId,records:Object.freeze(records)});
      return batch;
    },
    ack(batchId) {
      if(!enabled||!batch||typeof batchId!=='string'||batchId!==batch.batchId)return false;
      const t=clock();if(t===null)return false;
      if(t-created>=BATCH_TTL_MS){api.expire();return false;}
      remove(batch.records.length);batch=null;return true;
    },
    expire() {
      if(!enabled||!batch)return false;
      const t=clock();if(t===null||t-created<BATCH_TTL_MS)return false;
      dropped=add(dropped,batch.records.length);expired=add(expired,batch.records.length);
      remove(batch.records.length);batch=null;return true;
    },
    disable,
    health:()=>Object.freeze({enabled,queued:count,inFlight:batch?.records.length??0,dropped,invalid,expired,typedBytes}),
  };
  return Object.freeze(api);
}
