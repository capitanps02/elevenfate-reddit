import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {newDailyRun,applyDailyCommand,dailyRunView,dailyScore,DAILY_POSITIONS} from '../server/daily-run.mjs';
import {serializeDailyRun,hydrateDailyArchive} from '../server/daily-archive.mjs';
import {dailyConfig,createDailyService} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
const command=run=>({commandId:`frozen-${run.revision}`,expectedRevision:run.revision,type:run.summaryPending?'acknowledge':'choose',choiceId:run.pending?.kind==='club'?run.pending.clubs[run.revision%3].id:run.pending?.choices[run.revision%3].id});

test('v7 deployment preserves every v6 state/view digest captured before the change',()=>{
  const baseline=JSON.parse(readFileSync(new URL('../../docs/qa/valoracion-v7/v6-baseline.json',import.meta.url),'utf8'));
  const run=newDailyRun({seed:baseline.seed,rulesVersion:6}),digest=()=>createHash('sha256').update(JSON.stringify({run,view:dailyRunView(run)})).digest('hex'),steps=[digest()];
  while(!run.finished){applyDailyCommand(run,command(run));steps.push(digest());}
  assert.deepEqual(steps,baseline.steps);assert.deepEqual(dailyScore(run.state,run),baseline.score);
});

test('position assignment is deterministic and covers seven positions without consuming RNG',()=>{
  const seen=new Set();
  for(let seed=1;seed<=100;seed++){
    const run=newDailyRun({seed,rulesVersion:7}),again=newDailyRun({seed,rulesVersion:7}),previous=newDailyRun({seed,rulesVersion:6});
    assert.equal(run.state.sport.positionIdentity,again.state.sport.positionIdentity);
    assert.deepEqual(run.state.rngState,previous.state.rngState);seen.add(run.state.sport.positionIdentity);
    assert.equal(dailyRunView(run).position.id,run.state.sport.positionIdentity);
  }
  assert.deepEqual([...seen].sort(),[...DAILY_POSITIONS].sort());
  assert.throws(()=>newDailyRun({seed:1,rulesVersion:99}),/Reglas Daily no compatibles/);
});

test('v7 defensive careers close all seasons and survive compact reloads and duplicate commands',()=>{
  for(const position of ['goalkeeper','centre_back']){
    const seed=Array.from({length:100},(_,i)=>i+1).find(seed=>newDailyRun({seed,rulesVersion:7}).state.sport.positionIdentity===position);
    let run=newDailyRun({seed,rulesVersion:7});
    while(!run.finished){const c=command(run);applyDailyCommand(run,c);const before=structuredClone(run);run=hydrateDailyArchive(JSON.parse(serializeDailyRun(run)));assert.deepEqual(run,before);applyDailyCommand(run,c);assert.deepEqual(run,before);}
    assert.equal(run.competitions.length,20);assert.ok(run.competitions.every(s=>s.closed&&s.sportsVersion===4));assert.ok(run.cups.every(c=>c.closed));assert.ok(run.narrative.promises.every(p=>p.status!=='pending'));
    for(const season of run.competitions)assert.deepEqual(dailyRunView(run,season.id),dailyRunView(hydrateDailyArchive(JSON.parse(serializeDailyRun(run))),season.id));
    if(position==='goalkeeper')assert.equal(dailyRunView(run).totals.goals,0);
    assert.ok(Buffer.byteLength(serializeDailyRun(run))<2_000_000);
  }
});

test('v7 boundary preserves same-day v6 attempts, ranking namespace, and new users share a position',async()=>{
  assert.equal(dailyConfig(new Date('2026-10-07T23:59:59Z')).rulesVersion,6);
  assert.equal(dailyConfig(new Date('2026-10-08T00:00:00Z')).rulesVersion,7);
  const redis=createMemoryRedis(),now=new Date('2026-10-08T12:00:00Z'),previous=dailyConfig(now,6),config=dailyConfig(now),run=newDailyRun(previous),key=`${previous.id}:career:v1:t2_priorv6`;
  await redis.set(key,JSON.stringify({version:1,generation:1,active:serializeDailyRun(run),previous:null}));
  const service=createDailyService({redis,now:()=>now});
  assert.equal((await service.read('t2_priorv6')).config.id,previous.id);
  await assert.rejects(service.act('t2_priorv6',{dailyId:config.id,action:'start'}),e=>e.status===409);
  const a=await service.act('t2_freshv7',{dailyId:config.id,action:'start'}),b=await service.act('t2_freshv7b',{dailyId:config.id,action:'start'});
  assert.equal(a.config.rulesVersion,7);assert.deepEqual(a.view.position,b.view.position);assert.deepEqual((await service.read('t2_freshv7')).view,a.view);
});

test('invalid v7 position is rejected without overwriting the stored attempt',async()=>{
  const redis=createMemoryRedis(),now=new Date('2026-10-08T12:00:00Z'),config=dailyConfig(now),run=newDailyRun(config);run.state.sport.positionIdentity='invalid_position';
  const key=`${config.id}:career:v1:t2_badv7`,raw=JSON.stringify({version:1,generation:1,active:serializeDailyRun(run),previous:null});await redis.set(key,raw);
  await assert.rejects(createDailyService({redis,now:()=>now}).read('t2_badv7'),/El intento se conserva/);assert.equal(await redis.get(key),raw);
});
