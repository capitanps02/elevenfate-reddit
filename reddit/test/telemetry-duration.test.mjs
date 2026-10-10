import test from 'node:test';
import assert from 'node:assert/strict';
import {createDurationMeter} from '../telemetry/duration.mjs';
const setup=()=>{let t=0;const meter=createDurationMeter({mode:'behavior',now:()=>t});meter.startSegment(1);meter.setVisible(true);return {meter,set:x=>t=x};};
test('off and diagnostic never read clock or collect behavior',()=>{
  for(const mode of ['off','diagnostic','unknown']){
    const m=createDurationMeter({mode,now:()=>{throw Error('called');}});
    assert.equal(m.startSegment(1),null);assert.equal(m.action(),false);assert.equal(m.checkpoint(),null);
  }
});
test('visible time alone does not prove activity',()=>{
  const {meter,set}=setup();set(60_000);const x=meter.checkpoint();assert.equal(x.visibleMsTotal,60_000);assert.equal(x.activeMsTotal,0);assert.equal(x.partial,true);
});
test('activity caps at 120 seconds without a heartbeat',()=>{
  const {meter,set}=setup();meter.action();set(200_000);const x=meter.checkpoint();assert.equal(x.activeMsTotal,120_000);assert.equal(x.visibleMsTotal,200_000);
});
test('new valid action extends deadline after settling previous time',()=>{
  const {meter,set}=setup();meter.action();set(100_000);meter.action();set(250_000);assert.equal(meter.checkpoint().activeMsTotal,220_000);
});
test('hidden time excluded; returning does not renew activity',()=>{
  const {meter,set}=setup();meter.action();set(10_000);meter.setVisible(false);set(200_000);assert.equal(meter.action(),false);meter.setVisible(true);set(210_000);
  const x=meter.checkpoint();assert.equal(x.visibleMsTotal,20_000);assert.equal(x.activeMsTotal,10_000);
});
test('pause and network wait overlap without double subtraction',()=>{
  const {meter,set}=setup();meter.action();set(10_000);meter.setPaused(true);set(20_000);meter.setWaiting(true);set(30_000);meter.setPaused(false);set(40_000);meter.setWaiting(false);set(50_000);
  const x=meter.checkpoint();assert.equal(x.visibleMsTotal,50_000);assert.equal(x.activeMsTotal,20_000);
});
test('blocked actions cannot renew deadline',()=>{
  const {meter,set}=setup();meter.action();meter.setWaiting(true);set(200_000);assert.equal(meter.action(),false);meter.setWaiting(false);set(210_000);assert.equal(meter.checkpoint().activeMsTotal,0);
});
test('career or day transition closes old segment and resets new totals',()=>{
  const {meter,set}=setup();meter.action();set(1000);const previous=meter.startSegment(2);assert.equal(previous.activeMsTotal,1000);assert.equal(previous.closed,true);assert.equal(previous.partial,false);
  set(2000);const next=meter.checkpoint();assert.equal(next.segmentSeq,2);assert.equal(next.activeMsTotal,0);assert.equal(next.visibleMsTotal,1000);
});
test('checkpoints are immutable cumulative totals with growing revision',()=>{
  const {meter,set}=setup();meter.action();set(10);const x=meter.checkpoint();set(20);const y=meter.checkpoint();assert.ok(Object.isFrozen(x));assert.equal(x.activeMsTotal,10);assert.equal(y.activeMsTotal,20);assert.equal(y.counterRevision,x.counterRevision+1);
});
test('abrupt closure only has last observed checkpoint, no silence fill',()=>{
  const {meter,set}=setup();meter.action();set(1000);const last=meter.checkpoint();set(999_999); // Simulate no further callback before process death.
  assert.equal(last.activeMsTotal,1000);assert.equal(last.visibleMsTotal,1000);assert.equal(last.partial,true);
});
test('observed close stops collection until a new unique segment',()=>{
  const {meter,set}=setup();meter.action();set(1000);const end=meter.close(false);assert.equal(end.closed,true);assert.equal(end.partial,false);set(2000);assert.equal(meter.checkpoint(),null);assert.equal(meter.close(),null);
  assert.equal(meter.startSegment(1),null);meter.startSegment(2);set(3000);assert.equal(meter.checkpoint().visibleMsTotal,1000);
});
test('invalid booleans and old segment identifiers do not alter accounting',()=>{
  const {meter,set}=setup();assert.equal(meter.setVisible('yes'),false);assert.equal(meter.startSegment(0),null);set(10);assert.equal(meter.checkpoint().visibleMsTotal,10);
});
test('clock regression, nonfinite value and exception disable and purge',()=>{
  for(const bad of [-1,NaN,Infinity,()=>{throw Error('clock');}]){
    let t=1;const m=createDurationMeter({mode:'behavior',now:()=>typeof t==='function'?t():t});m.startSegment(1);t=bad;assert.equal(m.checkpoint(),null);assert.equal(m.enabled,false);
  }
  const {meter,set}=setup();set(10);meter.checkpoint();set(9);assert.equal(meter.checkpoint(),null);assert.equal(meter.enabled,false);
});
test('two hour sequence agrees with a separate interval reference',()=>{
  const {meter,set}=setup();let visible=true,paused=false,waiting=false,deadline=0,active=0,shown=0,t=0;
  for(let step=1;step<=7200;step++){
    const next=step*1000;if(visible){shown+=1000;if(!paused&&!waiting)active+=Math.max(0,Math.min(next,deadline)-t);}t=next;set(t);
    if(step%17===0){visible=!visible;meter.setVisible(visible);}
    if(step%23===0){paused=!paused;meter.setPaused(paused);}
    if(step%29===0){waiting=!waiting;meter.setWaiting(waiting);}
    if(step%31===0&&visible&&!paused&&!waiting){deadline=t+120_000;meter.action();}
    if(step%60===0){const x=meter.checkpoint();assert.equal(x.visibleMsTotal,shown);assert.equal(x.activeMsTotal,active);assert.ok(x.activeMsTotal<=x.visibleMsTotal);}
  }
});
