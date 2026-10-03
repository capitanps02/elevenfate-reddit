import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyConfig,createDailyService} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
import {createCareerService} from '../server/career-service.mjs';

const date=new Date('2026-10-03T15:00:00Z');
// Ranking is fetched on load/publication, independently from game progress.
const progress=({leaderboard,...state})=>state;
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
  return service.act(user,{dailyId:state.config.id,mode:state.mode,action:'command',command,score:999999});
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
    assert.deepEqual(progress(await daily.read('t2_alice')),progress(a));
  }
  assert.equal(a.resolved,5);assert.equal(a.finished,true);
  assert.ok(a.score.total>=0&&a.score.total<=1000);assert.notEqual(a.score.total,999999);
  assert.equal((await career.read('t2_alice')).active,'{"career":"keep"}');
  assert.deepEqual(progress(await daily.act('t2_alice',{dailyId:config.id,action:'start'})),progress(a));
  await assert.rejects(step(daily,'t2_alice',a),error=>error.status===409);
  const published=await daily.act('t2_alice',{dailyId:config.id,action:'publish',score:999999});
  assert.equal(published.leaderboard.total,1);assert.equal(published.leaderboard.rows[0].score,a.score.total);
  assert.equal(published.leaderboard.rows[0].you,true);
  await daily.act('t2_alice',{dailyId:config.id,action:'publish'});
  assert.equal((await daily.read('t2_alice')).leaderboard.total,1);
  const bobPublished=await daily.act('t2_bob',{dailyId:config.id,action:'publish'});
  assert.equal(bobPublished.leaderboard.total,2);assert.ok(bobPublished.leaderboard.position);
  assert.ok(bobPublished.leaderboard.rows.every(row=>!('member' in row)));
});
test('Daily rejects old days and simulation/import commands without changing progress',async()=>{
  let now=date;const daily=createDailyService({redis:createMemoryRedis(),now:()=>now});
  const config=dailyConfig(date),before=await daily.act('t2_alice',{dailyId:config.id,action:'start'});
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,command:{type:'continue'},action:'command'}),error=>error.status===400);
  assert.deepEqual(progress(await daily.read('t2_alice')),progress(before));
  now=new Date('2026-10-04T00:00:00Z');
  assert.equal((await daily.read('t2_alice')).started,false);
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,action:'start'}),error=>error.status===409);
  await assert.rejects(daily.read(undefined),error=>error.status===401);
});
test('practice can finish without entering ranking or consuming the Daily attempt',async()=>{
  const daily=createDailyService({redis:createMemoryRedis(),now:()=>date}),config=dailyConfig(date);
  const competitive=await daily.act('t2_alice',{dailyId:config.id,action:'start'});
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,action:'publish'}),error=>error.status===400);
  let practice=await daily.act('t2_alice',{dailyId:config.id,mode:'practice',action:'start'});
  for(let i=0;i<30&&!practice.finished;i++)practice=await step(daily,'t2_alice',practice);
  assert.equal(practice.finished,true);assert.equal(practice.leaderboard,undefined);
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,mode:'practice',action:'publish'}),error=>error.status===400);
  assert.deepEqual(progress(await daily.read('t2_alice')),progress(competitive));
  assert.deepEqual(await daily.read('t2_alice','practice'),practice);
});
