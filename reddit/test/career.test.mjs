import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareerService} from '../server/career-service.mjs';
import {createRedditSaveStore} from '../client/save-store.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
const validate=async raw=>{if(!Number.isInteger(JSON.parse(raw).revision))throw Error('Invalid save');};
function fixture(){
  const redis=createMemoryRedis(),service=createCareerService({redis,validate});
  const request=userId=>async(_path,options)=>{
    try{return Response.json(options.method==='PUT'?await service.write(userId,JSON.parse(options.body)):await service.read(userId));}
    catch(error){return Response.json({error:error.message},{status:error.status||500});}
  };
  return {redis,service,device:userId=>createRedditSaveStore({request:request(userId),validate})};
}
test('PC save continues on a second device; accounts remain isolated',async()=>{
  const {device}=fixture(),pc=device('t2_alice'),phone=device('t2_alice'),other=device('t2_bob');
  assert.equal(await pc.read(),null);await pc.write({revision:0},null);
  assert.equal(await phone.read(),'{"revision":0}');assert.equal(await other.read(),null);
  await phone.write({revision:1},'{"revision":0}');assert.equal(await pc.read(),'{"revision":1}');
});
test('stale device cannot overwrite progress, but user can reload and retry',async()=>{
  const {device}=fixture(),a=device('t2_alice'),b=device('t2_alice');
  await a.read();await a.write({revision:0},null);await b.read();
  await a.write({revision:1},'{"revision":0}');
  await assert.rejects(b.write({revision:2},'{"revision":0}'),/otro dispositivo/);
  assert.equal(await b.read(),'{"revision":1}');
  await b.write({revision:2},'{"revision":1}');assert.equal(await a.read(),'{"revision":2}');
});
test('concurrent saves allow exactly one writer and retain the recovery copy',async()=>{
  const {service}=fixture();await service.write('t2_alice',{raw:'{"revision":0}',expectedGeneration:0});
  const results=await Promise.allSettled([1,2].map(revision=>service.write('t2_alice',{raw:JSON.stringify({revision}),expectedGeneration:1})));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
  assert.equal((await service.read('t2_alice')).previous,'{"revision":0}');
});
test('retry after a lost response is idempotent; old unrelated save is rejected',async()=>{
  const {service}=fixture(),body={raw:'{"revision":0}',expectedGeneration:0};
  await service.write('t2_alice',body);assert.equal((await service.write('t2_alice',body)).generation,1);
  await service.write('t2_alice',{raw:'{"revision":1}',expectedGeneration:1});
  await assert.rejects(service.write('t2_alice',body),error=>error.status===409);
});
test('invalid, oversized and anonymous writes never change a confirmed save',async()=>{
  const {service}=fixture();await service.write('t2_alice',{raw:'{"revision":0}',expectedGeneration:0});
  for(const [id,raw,status] of [['t2_alice','{}',400],['t2_alice','x'.repeat(1_500_001),413],[undefined,'{"revision":1}',401]]){
    await assert.rejects(service.write(id,{raw,expectedGeneration:1}),error=>error.status===status);
  }
  assert.equal((await service.read('t2_alice')).active,'{"revision":0}');
});
test('network failure cannot be presented as a successful cloud save',async()=>{
  const {service}=fixture();await service.write('t2_alice',{raw:'{"revision":0}',expectedGeneration:0});
  const client=createRedditSaveStore({validate,request:async(_p,o)=>{if(o.method==='PUT')throw Error('offline');return Response.json(await service.read('t2_alice'));}});
  await client.read();await assert.rejects(client.write({revision:1},'{"revision":0}'),/confirmar el guardado/);
  assert.equal((await service.read('t2_alice')).active,'{"revision":0}');
});
test('deletion removes active and recovery data and rejects stale-device resurrection',async()=>{
  const {service}=fixture();
  await service.write('t2_alice',{raw:'{"revision":0}',expectedGeneration:0});
  await service.write('t2_alice',{raw:'{"revision":1}',expectedGeneration:1});
  const removed=await service.remove('t2_alice',{expectedGeneration:2});
  assert.equal(removed.active,null);assert.equal(removed.previous,null);
  await assert.rejects(service.write('t2_alice',{raw:'{"revision":2}',expectedGeneration:2}),error=>error.status===409);
  await service.write('t2_alice',{raw:'{"revision":0}',expectedGeneration:removed.generation});
  assert.equal((await service.read('t2_alice')).previous,null);
});
