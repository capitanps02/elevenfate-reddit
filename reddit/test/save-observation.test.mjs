import test from 'node:test';
import assert from 'node:assert/strict';
import {createRedditSaveStore} from '../client/save-store.mjs';
const response=data=>({ok:true,status:200,json:async()=>data});
const initial={version:1,generation:0,active:null,previous:null};
test('a committed save with a lost response reconciles without another PUT and retains release observations',async()=>{
 let record={...initial};const requests=[],events=[];
 const store=createRedditSaveStore({validate:()=>{},retryDelay:async()=>{},observe:(...args)=>events.push(args),request:async(_url,options)=>{
  requests.push(options.method);
  if(options.method==='PUT'){const {raw,expectedGeneration}=JSON.parse(options.body);assert.equal(expectedGeneration,0);record={...record,active:raw,generation:1};throw Error('response lost');}
  return response(record);
 }});
 await store.read();await store.write({sessionId:'candidate'},null);
 assert.deepEqual(requests,['GET','PUT','GET']);
 assert.equal(events.filter(e=>e[1]==='save_attempt').length,1);
 assert.equal(events.filter(e=>e[1]==='save_error').length,1);
 assert.equal(events.filter(e=>e[1]==='load_ok').length,2);
 assert.equal(await store.readRaw(),JSON.stringify({sessionId:'candidate'}));
});
test('observation failure cannot alter the confirmed save transaction',async()=>{
 let record={...initial};
 const store=createRedditSaveStore({validate:()=>{},observe(){throw Error('observer failed');},request:async(_url,options)=>{if(options.method==='PUT')record={...record,generation:1,active:JSON.parse(options.body).raw};return response(record);}});
 await store.read();await store.write({sessionId:'candidate'},null);assert.equal(record.generation,1);
});
