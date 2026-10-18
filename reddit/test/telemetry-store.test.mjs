import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnosticStore} from '../telemetry/diagnostic-store.mjs';
import {createTelemetryCore} from '../telemetry/core.mjs';
import {createDiagnosticSender} from '../telemetry/diagnostic-sender.mjs';
function fixture() {
  const data=new Map(),versions=new Map(),touched=[];let time=1_000_000,beforeExec=null,loseReply=false,failExec=false,open=0;
  const key='telemetry:diag:v1:subject1';
  const redis={get:async k=>data.get(k),watch:async k=>{
    touched.push(k);open++;const v=versions.get(k)??0;let value,done=false;
    const close=()=>{if(!done){done=true;open--;}};
    return {multi:async()=>{},set:async(k2,raw)=>{assert.equal(k2,k);value=raw;},discard:async()=>close(),exec:async()=>{
      if(beforeExec){const hook=beforeExec;beforeExec=null;await hook();}
      close();if(failExec)throw Error('storage');if(v!==(versions.get(k)??0))return null;
      data.set(k,value);versions.set(k,v+1);if(loseReply){loseReply=false;throw Error('lost reply');}return ['OK'];
    }};
  }};
  const store=createDiagnosticStore({enabled:true,redis,now:()=>time});
  const wire=(seq=1,batchId='b1',generation=1)=>JSON.stringify({schema:1,catalog:1,session:'s1',generation,batchId,records:[{code:1,seq,at:seq,a:1,b:0,c:0}]});
  return {store,data,key,touched,wire,state:()=>JSON.parse(data.get(key)),setState:s=>data.set(key,JSON.stringify(s)),setTime:t=>time=t,
    grant:(expectedGeneration=0,session='s1')=>store.configure('subject1',{expectedGeneration,allowed:true,session,expiresAt:time+1_800_000}),revoke:(expectedGeneration=1)=>store.configure('subject1',{expectedGeneration,allowed:false}),before:fn=>beforeExec=fn,lost:()=>loseReply=true,fail:()=>failExec=true,open:()=>open};
}
test('store off touches no dependencies',async()=>{const s=createDiagnosticStore({get redis(){throw Error('access');}});assert.equal((await s.receive('x','{}')).result,'disabled');});
test('missing state never grants capture; configured lease uses new generation',async()=>{const f=fixture();assert.equal((await f.store.receive('subject1',f.wire())).status,403);const g=await f.grant();assert.equal(g.generation,1);const r=await f.store.receive('subject1',f.wire());assert.equal(r.result,'accepted');assert.equal(f.state().counts[0],1);assert.equal(f.open(),0);});
test('duplicate persists quota but does not increment aggregates again',async()=>{const f=fixture();await f.grant();const w=f.wire();await f.store.receive('subject1',w);assert.equal((await f.store.receive('subject1',w)).result,'duplicate');assert.equal(f.state().samples,1);assert.equal(f.state().dayBytes,2*new TextEncoder().encode(w).byteLength);});
test('lost reply after commit recovers through duplicate',async()=>{const f=fixture();await f.grant();f.lost();assert.equal((await f.store.receive('subject1',f.wire())).status,503);assert.equal(f.state().samples,1);assert.equal((await f.store.receive('subject1',f.wire())).result,'duplicate');assert.equal(f.state().samples,1);assert.equal(f.open(),0);});
test('storage failure and corrupt state do not acknowledge or overwrite',async()=>{const f=fixture();await f.grant();const before=f.data.get(f.key);f.fail();assert.equal((await f.store.receive('subject1',f.wire())).status,503);assert.equal(f.data.get(f.key),before);f.data.set(f.key,'broken');assert.equal((await f.store.receive('subject1',f.wire())).status,503);assert.equal(f.data.get(f.key),'broken');assert.equal(f.open(),0);});
test('concurrent identical batches admit exactly one and conflict returns retry',async()=>{const f=fixture();await f.grant();f.before(async()=>{assert.equal((await f.store.receive('subject1',f.wire())).result,'accepted');});assert.equal((await f.store.receive('subject1',f.wire())).status,503);assert.equal(f.state().samples,1);assert.equal((await f.store.receive('subject1',f.wire())).result,'duplicate');});
test('revocation before commit prevents data resurrection',async()=>{const f=fixture();await f.grant();f.before(async()=>{assert.equal((await f.revoke()).result,'revoked');});assert.equal((await f.store.receive('subject1',f.wire())).status,503);assert.equal(f.state().allowed,false);assert.equal(f.state().receipt,null);assert.equal(f.state().samples,0);assert.equal((await f.store.receive('subject1',f.wire())).status,403);});
test('revocation after acceptance purges aggregates and keeps quota',async()=>{const f=fixture();await f.grant();await f.store.receive('subject1',f.wire());const spent=f.state().dayBytes;await f.revoke();assert.equal(f.state().samples,0);assert.equal(f.state().counts.reduce((a,b)=>a+b),0);assert.equal(f.state().dayBytes,spent);await f.grant(2);assert.equal(f.state().generation,3);assert.equal((await f.store.receive('subject1',f.wire())).status,403);assert.equal(f.state().samples,0);});
test('daily quota survives new lease and rejects excess without overwrite',async()=>{const f=fixture();await f.grant();f.setState({...f.state(),dayBytes:524_280});await f.revoke();await f.grant(2);assert.equal(f.state().dayBytes,524_280);const before=f.data.get(f.key);assert.equal((await f.store.receive('subject1',f.wire(1,'b1',3))).status,429);assert.equal(f.data.get(f.key),before);});
test('UTC rollover resets daily budget but expired lease cannot reopen itself',async()=>{const f=fixture();f.setTime(86_399_000);await f.grant();f.setState({...f.state(),dayBytes:524_288});f.setTime(86_400_001);assert.equal((await f.store.receive('subject1',f.wire())).result,'accepted');assert.equal(f.state().day,1);f.setTime(88_200_000);assert.equal((await f.store.receive('subject1',f.wire(2,'b2'))).status,403);});
test('invalid and changed batches consume permitted-context quota without counts',async()=>{const f=fixture();await f.grant();assert.equal((await f.store.receive('subject1','{}')).status,400);await f.store.receive('subject1',f.wire());assert.equal((await f.store.receive('subject1',f.wire(2))).status,409);assert.equal(f.state().samples,1);assert.ok(f.state().dayBytes>2);});
test('invalid permission, old generation and oversized payload leave storage untouched',async()=>{const f=fixture();assert.equal((await f.store.configure('subject1',{expectedGeneration:0,allowed:true,session:'s1',expiresAt:0})).status,400);await f.grant();assert.equal((await f.grant()).status,409);const before=f.data.get(f.key);assert.equal((await f.store.receive('subject1','x'.repeat(16_385))).status,413);assert.equal(f.data.get(f.key),before);assert.ok(f.touched.every(k=>k.startsWith('telemetry:diag:')));});
test('lease renewal preserves aggregates and quota, closes old session generation',async()=>{const f=fixture();await f.grant();await f.store.receive('subject1',f.wire());const spent=f.state().dayBytes;await f.grant(1);assert.equal(f.state().samples,1);assert.equal(f.state().dayBytes,spent);assert.equal(f.state().receipt,null);assert.equal((await f.store.receive('subject1',f.wire())).status,403);assert.equal((await f.store.receive('subject1',f.wire(1,'new',2))).result,'accepted');assert.equal(f.state().samples,2);});
test('isolated sender to store recovers lost transport reply without double count',async()=>{const f=fixture();await f.grant();let clientTime=0,first=true;const timers=new Map();
  const core=createTelemetryCore({mode:'diagnostic',now:()=>clientTime});
  const sender=createDiagnosticSender({mode:'diagnostic',core,now:()=>clientTime,busy:()=>false,lease:{allowed:true,session:'s1',generation:1,deadline:1_800_000},setTimer:fn=>{timers.set(1,fn);return 1;},clearTimer:id=>timers.delete(id),send:async text=>{const response=await f.store.receive('subject1',text);if(first){first=false;throw Error('lost reply');}return response;}});
  const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
  core.tryRecord(1,1,0,0);assert.equal(sender.pump(),true);await flush();assert.equal(f.state().samples,1);assert.equal(core.health().queued,1);
  clientTime=60_000;f.setTime(1_060_000);assert.equal(sender.pump(),true);await flush();assert.equal(f.state().samples,1);assert.equal(core.health().queued,0);assert.equal(timers.size,0);assert.equal(f.open(),0);
});
