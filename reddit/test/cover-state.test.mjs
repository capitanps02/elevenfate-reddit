import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoverState} from '../client/cover-state.mjs';

test('absence requires a confirmed null read and never creates a career',async()=>{
 let reads=0;const changes=[];
 const model=createCoverState({readCareer:async()=>{reads++;return null;},onChange:s=>changes.push(s)});
 assert.equal(model.get().hasCareer,null);
 await model.refresh();assert.equal(reads,1);
 assert.deepEqual(model.get(),{status:'ready',hasCareer:false,error:''});
 assert.equal(changes[0].status,'checking');
});
test('confirmed save enables Continue without altering its bytes',async()=>{
 const raw='{"sessionId":"saved","revision":7}';
 const model=createCoverState({readCareer:async()=>raw});
 await model.refresh();assert.equal(model.get().hasCareer,true);assert.equal(raw,'{"sessionId":"saved","revision":7}');
});
test('network failure remains unknown, not an empty career',async()=>{
 const model=createCoverState({readCareer:async()=>{throw Error('offline');}});
 await model.refresh();assert.equal(model.get().status,'error');assert.equal(model.get().hasCareer,null);
 assert.equal(model.get().error,'offline');
});
test('a stale read cannot replace the result of a newer refresh',async()=>{
 let resolveOld;let calls=0;
 const model=createCoverState({readCareer:()=>++calls===1?new Promise(resolve=>{resolveOld=resolve;}):Promise.resolve(null)});
 const old=model.refresh();await model.refresh();resolveOld('outdated-save');await old;
 assert.equal(model.get().hasCareer,false);
});
test('disposed entry ignores late reads',async()=>{
 let complete;let count=0;
 const model=createCoverState({readCareer:()=>new Promise(resolve=>{complete=resolve;}),onChange:()=>count++});
 const pending=model.refresh();model.dispose();complete('saved');await pending;
 assert.equal(count,1);
});
test('malformed availability response fails closed',async()=>{
 const model=createCoverState({readCareer:async()=>({active:'invalid-envelope'})});
 await model.refresh();assert.equal(model.get().status,'error');assert.equal(model.get().hasCareer,null);
});
