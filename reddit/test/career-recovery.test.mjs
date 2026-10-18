import test from 'node:test';
import assert from 'node:assert/strict';
import {createRedditSaveStore} from '../client/save-store.mjs';
import {createCareerService} from '../server/career-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
import {GameSession} from '../../dist/session/game-session.js';

const validate=async raw=>{assert.ok(Number.isInteger(JSON.parse(raw).revision));};
async function fixture(intercept,options={}){
 const service=createCareerService({redis:createMemoryRedis(),validate});
 await service.write('t2_alice',{raw:'{"revision":0}',expectedGeneration:0});
 const calls=[],cache=[];
 const perform=async o=>Response.json(o.method==='PUT'?await service.write('t2_alice',JSON.parse(o.body)):o.method==='DELETE'?await service.remove('t2_alice',JSON.parse(o.body)):await service.read('t2_alice'));
 const store=createRedditSaveStore({validate,retryDelay:async()=>{},storage:{setItem:(_,raw)=>cache.push(raw),removeItem(){}},request:async(_p,o)=>{calls.push(o);return intercept(o,()=>perform(o),service,calls);},...options});
 await store.read();calls.length=0;cache.length=0;
 return {store,service,calls,cache};
}
test('lost response after commit is confirmed by GET without another PUT',async()=>{
 const f=await fixture(async(o,next)=>{const r=await next();if(o.method==='PUT')throw Error('lost');return r;});
 await f.store.write({revision:1},'{"revision":0}');
 assert.deepEqual(f.calls.map(x=>x.method),['PUT','GET']);assert.equal((await f.service.read('t2_alice')).generation,2);assert.equal(f.cache.length,1);
});
test('failure before commit retries identical bytes and generation exactly once',async()=>{
 let puts=0;const f=await fixture((o,next)=>{if(o.method==='PUT'&&++puts===1)throw Error('offline');return next();});
 await f.store.write({revision:1},'{"revision":0}');
 assert.deepEqual(f.calls.map(x=>x.method),['PUT','GET','PUT']);assert.equal(f.calls[0].body,f.calls[2].body);assert.equal((await f.service.read('t2_alice')).previous,'{"revision":0}');
});
test('second response loss is reconciled, while two failed writes never report success',async()=>{
 for(const commit of [true,false]){
  let puts=0;const f=await fixture(async(o,next)=>{if(o.method!=='PUT')return next();if(++puts===2&&commit)await next();throw Error('lost');});
  const result=f.store.write({revision:1},'{"revision":0}');if(commit)await result;else await assert.rejects(result,/confirmar/);
  assert.deepEqual(f.calls.map(x=>x.method),['PUT','GET','PUT','GET']);assert.equal(f.cache.length,commit?1:0);
 }
});
test('another device winning during uncertainty is never overwritten',async()=>{
 const f=await fixture(async(o,next,service)=>{if(o.method!=='PUT')return next();await service.write('t2_alice',{raw:'{"revision":9}',expectedGeneration:1});throw Error('lost');});
 await assert.rejects(f.store.write({revision:1},'{"revision":0}'),/otro dispositivo/);assert.equal(f.calls.length,2);assert.equal((await f.service.read('t2_alice')).active,'{"revision":9}');assert.equal(f.cache.length,0);
});
test('failed reconciliation stops without a speculative PUT or false cache update',async()=>{
 let fail=false;const f=await fixture((o,next)=>{if(fail)throw Error('offline');return next();});fail=true;
 await assert.rejects(f.store.write({revision:1},'{"revision":0}'),/confirmar/);assert.deepEqual(f.calls.map(x=>x.method),['PUT','GET']);assert.equal(f.cache.length,0);
});
test('truncated successful JSON after commit is reconciled',async()=>{
 const f=await fixture(async(o,next)=>{const response=await next();return o.method==='PUT'?{ok:true,status:200,json:async()=>{throw Error('Load failed');}}:response;});
 await f.store.write({revision:1},'{"revision":0}');assert.deepEqual(f.calls.map(x=>x.method),['PUT','GET']);
});
test('permanent HTTP errors are not retried even with broken or stalled JSON',async()=>{
 for(const status of [400,401,403,409,413])for(const stalled of [false,true]){
  const f=await fixture((o,next)=>o.method==='PUT'?{ok:false,status,json:()=>stalled?new Promise(()=>{}):Promise.reject(Error('bad JSON'))}:next(),{timeoutMs:10});
  await assert.rejects(f.store.write({revision:1},'{"revision":0}'));assert.deepEqual(f.calls.map(x=>x.method),['PUT']);assert.equal(f.cache.length,0);
 }
});
test('transient HTTP errors reconcile and make only one retry',async()=>{
 for(const status of [408,429,500,502,503,504]){
  let puts=0;const f=await fixture((o,next)=>o.method==='PUT'&&++puts===1?Response.json({error:'temporary'},{status}):next());
  await f.store.write({revision:1},'{"revision":0}');assert.deepEqual(f.calls.map(x=>x.method),['PUT','GET','PUT']);
 }
});
test('timeout bounds both fetch and body reads; late replies cannot replace confirmed state',async()=>{
 for(const body of [false,true]){
  let late,puts=0;const f=await fixture(async(o,next)=>{if(o.method!=='PUT'||++puts>1)return next();await next();const pending=new Promise(resolve=>late=resolve);return body?{ok:true,status:200,json:()=>pending}:pending;},{timeoutMs:10});
  await f.store.write({revision:1},'{"revision":0}');assert.equal(f.calls[0].signal.aborted,true);assert.deepEqual(f.calls.map(x=>x.method),['PUT','GET']);
  const obsolete={version:1,generation:0,active:null,previous:null};late(body?obsolete:Response.json(obsolete));await Promise.resolve();
  await f.store.write({revision:2},'{"revision":1}');assert.equal((await f.service.read('t2_alice')).generation,3);
 }
});
test('invalid 200 receipt cannot be treated as a confirmed save',async()=>{
 const f=await fixture((o,next)=>o.method==='PUT'?Response.json({}):next());
 await assert.rejects(f.store.write({revision:1},'{"revision":0}'));assert.equal(f.cache.length,0);assert.equal(f.calls.length,4);
});
test('explicit imports and deletions do not automatically replay',async()=>{
 const f=await fixture((o,next)=>o.method!=='GET'?Promise.reject(Error('offline')):next());
 await assert.rejects(f.store.write({revision:1},'{"revision":0}',{recover:false}));assert.deepEqual(f.calls.map(x=>x.method),['PUT']);
 f.calls.length=0;await assert.rejects(f.store.remove());assert.deepEqual(f.calls.map(x=>x.method),['DELETE']);
});
test('real GameSession commits one deterministic candidate when its response is lost',async()=>{
 const service=createCareerService({redis:createMemoryRedis(),validate});let lose=false,puts=0;
 const store=createRedditSaveStore({validate,retryDelay:async()=>{},request:async(_p,o)=>{
  if(o.method==='GET')return Response.json(await service.read('t2_alice'));
  puts++;const next=await service.write('t2_alice',JSON.parse(o.body));if(lose){lose=false;throw Error('lost');}return Response.json(next);
 }});
 let confirmed=null;const session=await GameSession.create(424242,{events:[],sessionId:'recovery',commit:async snapshot=>{await store.write(snapshot,confirmed);confirmed=JSON.stringify(snapshot);}});
 const reference=await GameSession.migrateFromSave(confirmed,{events:[]});lose=true;const before=puts;
 const command={type:'identity',displayName:'Pedro Test',expectedRevision:session.getView().revision,commandId:'identity-once'};
 await session.dispatch(command);await reference.dispatch(command);
 assert.equal(puts,before+1);assert.equal(JSON.stringify(session.exportSnapshot()),JSON.stringify(reference.exportSnapshot()));assert.equal((await service.read('t2_alice')).active,confirmed);
});
