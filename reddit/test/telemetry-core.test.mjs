import test from 'node:test';
import assert from 'node:assert/strict';
import {createTelemetryCore,CAPACITY,BEHAVIOR_CAPACITY,MAX_BATCH,BATCH_TTL_MS} from '../telemetry/core.mjs';
const setup=(mode='behavior')=>{let time=0;return {core:createTelemetryCore({mode,now:()=>time}),set:t=>time=t};};
test('off and unknown modes allocate no queue and never invoke clock',()=>{
  for(const mode of [undefined,'off','invalid']){
    const core=createTelemetryCore({mode,now:()=>{throw Error('called');}});
    assert.equal(core.tryRecord(1),false);assert.equal(core.freeze('batch'),null);assert.equal(core.health().typedBytes,0);
  }
});
test('callsite guard prevents evaluating dropped arguments',()=>{
  const core=createTelemetryCore();let evaluated=0;
  if(core.enabled)core.tryRecord(1,++evaluated);
  assert.equal(evaluated,0);
});
test('diagnostic rejects behavior before calling clock',()=>{
  let reads=0;const core=createTelemetryCore({mode:'diagnostic',now:()=>++reads});
  assert.equal(core.tryRecord(32),false);assert.equal(reads,0);assert.equal(core.tryRecord(1),true);
});
test('full behavior queue leaves 64 technical slots and in-flight remains counted',()=>{
  const {core}=setup();for(let i=0;i<BEHAVIOR_CAPACITY;i++)assert.equal(core.tryRecord(32,i),true);
  assert.equal(core.tryRecord(32),false);const first=core.freeze('first');
  for(let i=0;i<64;i++)assert.equal(core.tryRecord(1),true);
  assert.equal(core.health().queued,CAPACITY);assert.equal(core.health().inFlight,MAX_BATCH);
  assert.equal(core.tryRecord(1),false);assert.equal(core.ack(first.batchId),true);
  for(let i=0;i<32;i++)assert.equal(core.tryRecord(32),true);
  assert.equal(core.health().queued,CAPACITY);
});
test('technical events can use all slots',()=>{
  const {core}=setup();for(let i=0;i<CAPACITY;i++)assert.equal(core.tryRecord(1),true);
  assert.equal(core.tryRecord(1),false);
});
test('batch is frozen, stable under captures, and only matching ack removes it',()=>{
  const {core}=setup();core.tryRecord(1,7,8,9);const batch=core.freeze('b1');
  assert.ok(Object.isFrozen(batch));assert.ok(Object.isFrozen(batch.records));assert.ok(Object.isFrozen(batch.records[0]));
  assert.throws(()=>{batch.records[0].a=42;},TypeError);
  const bytes=JSON.stringify(batch);core.tryRecord(2);assert.equal(core.freeze('b2'),batch);
  assert.equal(JSON.stringify(batch),bytes);assert.equal(core.ack('wrong'),false);assert.equal(core.health().queued,2);
  assert.equal(core.ack(batch.batchId),true);assert.equal(core.ack(batch.batchId),false);assert.equal(core.freeze('b2').records[0].seq,2);
});
test('expiration and late ack cannot block subsequent batches',()=>{
  const {core,set}=setup();core.tryRecord(1);const old=core.freeze('old');core.tryRecord(2);
  set(BATCH_TTL_MS-1);assert.equal(core.expire(),false);set(BATCH_TTL_MS);assert.equal(core.ack(old.batchId),false);
  assert.equal(core.health().expired,1);assert.equal(core.health().queued,1);assert.equal(core.freeze('next').records[0].code,2);
});
test('ring wraps without stale references or sequence duplication',()=>{
  const {core}=setup();let expected=1;
  for(let cycle=0;cycle<100;cycle++){
    for(let i=0;i<256;i++)core.tryRecord(1,cycle,i);
    for(let j=0;j<8;j++){
      const id=`c${cycle}_${j}`,batch=core.freeze(id);
      for(const row of batch.records){assert.equal(row.seq,expected++);assert.equal(row.a,cycle);}
      assert.equal(core.ack(batch.batchId),true);
    }
    assert.equal(core.health().queued,0);
  }
});
test('invalid primitives and objects are rejected without traversing getters',()=>{
  const {core}=setup();let accessed=0;const object={get value(){accessed++;throw Error('getter');}};
  for(const value of [object,NaN,Infinity,'token',null,undefined])assert.equal(core.tryRecord(1,value,object),false);
  for(const code of [0,9,31,40,NaN,object])assert.equal(core.tryRecord(code),false);
  assert.equal(accessed,0);assert.equal(core.health().queued,0);
});
test('clock failure, invalid time or regression disables capture and purges',()=>{
  for(const bad of [NaN,-1,Infinity,()=>{throw Error('clock');}]){
    let value=1;const core=createTelemetryCore({mode:'behavior',now:()=>typeof value==='function'?value():value});
    core.tryRecord(1);core.freeze('before');value=bad;assert.equal(core.tryRecord(1),false);
    assert.equal(core.enabled,false);assert.equal(core.health().queued,0);assert.equal(core.freeze('after'),null);
  }
  const {core,set}=setup();set(5);core.tryRecord(1);set(4);assert.equal(core.tryRecord(1),false);assert.equal(core.enabled,false);
});
test('disable purges an in-flight batch and refuses old ack',()=>{
  const {core}=setup();core.tryRecord(1);core.freeze('a');core.disable();
  assert.equal(core.health().queued,0);assert.equal(core.health().inFlight,0);assert.equal(core.ack('a'),false);assert.equal(core.tryRecord(1),false);
});
test('core installs no browser resources or engine dependencies',async()=>{
  const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../telemetry/core.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(fetch|setTimeout|setInterval|addEventListener|localStorage|requestAnimationFrame|dispatch)\s*\(/);
  assert.doesNotMatch(source,/^import\s/m);
});

test('reusing a prefix cannot make an old acknowledgement remove a new batch',()=>{
  const {core,set}=setup();core.tryRecord(1);const old=core.freeze('same');
  set(BATCH_TTL_MS);core.expire();core.tryRecord(2);const next=core.freeze('same');
  assert.notEqual(old.batchId,next.batchId);assert.equal(core.ack(old.batchId),false);
  assert.equal(core.health().queued,1);assert.equal(core.ack(next.batchId),true);
});
