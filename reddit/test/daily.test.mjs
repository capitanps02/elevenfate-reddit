import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyConfig,createDailyService} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
import {createCareerService} from '../server/career-service.mjs';

const date=new Date('2026-10-03T15:00:00Z');
test('Daily configuration uses UTC and changes at the next UTC day',()=>{
  const a=dailyConfig(new Date('2026-10-03T00:00:00Z')),b=dailyConfig(new Date('2026-10-03T23:59:59Z'));
  assert.deepEqual(a,b);assert.notEqual(a.seed,dailyConfig(new Date('2026-10-04T00:00:00Z')).seed);
  assert.equal(a.resetsAt,'2026-10-04T00:00:00.000Z');
});
async function step(service,user,state){
  const v=state.view,command={commandId:`choice-${v.revision}`,expectedRevision:v.revision};
  if(v.screen==='decision')Object.assign(command,{type:'choose',pendingInstanceId:v.decision.instanceId,choiceId:v.decision.choices[0].id});
  else if(v.screen==='result')command.type='acknowledge';
  else if(v.screen==='offer')Object.assign(command,{type:'offer',offerId:v.offer.id,action:'accept'});
  else throw Error(`Unexpected screen ${v.screen}`);
  return service.act(user,{dailyId:state.config.id,action:'command',command,score:999999});
}
test('same Daily choices give identical results, survive reload and never overwrite career',async()=>{
  const redis=createMemoryRedis(),daily=createDailyService({redis,now:()=>date});
  const career=createCareerService({redis,validate:()=>{}});
  await career.write('t2_alice',{raw:'{"career":"keep"}',expectedGeneration:0});
  const config=dailyConfig(date);
  let a=await daily.act('t2_alice',{dailyId:config.id,action:'start'}),b=await daily.act('t2_bob',{dailyId:config.id,action:'start'});
  assert.deepEqual(a,b);
  for(let i=0;i<30&&!a.finished;i++){
    [a,b]=await Promise.all([step(daily,'t2_alice',a),step(daily,'t2_bob',b)]);
    assert.deepEqual(a,b);
    assert.deepEqual(await daily.read('t2_alice'),a);
  }
  assert.equal(a.resolved,5);assert.equal(a.finished,true);
  assert.ok(a.score.total>=0&&a.score.total<=1000);assert.notEqual(a.score.total,999999);
  assert.equal((await career.read('t2_alice')).active,'{"career":"keep"}');
  assert.deepEqual(await daily.act('t2_alice',{dailyId:config.id,action:'start'}),a);
  await assert.rejects(step(daily,'t2_alice',a),error=>error.status===409);
});
test('Daily rejects old days and simulation/import commands without changing progress',async()=>{
  let now=date;const daily=createDailyService({redis:createMemoryRedis(),now:()=>now});
  const config=dailyConfig(date),before=await daily.act('t2_alice',{dailyId:config.id,action:'start'});
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,command:{type:'continue'},action:'command'}),error=>error.status===400);
  assert.deepEqual(await daily.read('t2_alice'),before);
  now=new Date('2026-10-04T00:00:00Z');
  assert.equal((await daily.read('t2_alice')).started,false);
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,action:'start'}),error=>error.status===409);
  await assert.rejects(daily.read(undefined),error=>error.status===401);
});
