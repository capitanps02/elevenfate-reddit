import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyConfig,createDailyService} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
import {createCareerService} from '../server/career-service.mjs';

const date=new Date('2026-10-03T15:00:00Z');
// Ranking can change when another player finishes; career progress cannot.
const progress=({leaderboard,...state})=>state;
test('Daily configuration uses UTC and changes at the next UTC day',()=>{
  const a=dailyConfig(new Date('2026-10-03T00:00:00Z')),b=dailyConfig(new Date('2026-10-03T23:59:59Z'));
  assert.deepEqual(progress(a),progress(b));assert.notEqual(a.seed,dailyConfig(new Date('2026-10-04T00:00:00Z')).seed);
  assert.equal(a.resetsAt,'2026-10-04T00:00:00.000Z');
});
async function step(service,user,state){
  const v=state.view,command={commandId:`choice-${v.revision}`,expectedRevision:v.revision};
  if(v.screen==='club')Object.assign(command,{type:'choose',choiceId:v.clubs[0].id});
  else if(v.screen==='decision')Object.assign(command,{type:'choose',choiceId:v.decision.choices[0].id});
  else if(v.screen==='summary')command.type='acknowledge';
  else throw Error(`Unexpected screen ${v.screen}`);
  return service.act(user,{dailyId:state.config.id,mode:state.mode,action:'command',command,score:999999});
}
test('same Daily choices give identical results, survive reload and never overwrite career',async()=>{
  const redis=createMemoryRedis(),daily=createDailyService({redis,now:()=>date});
  const career=createCareerService({redis,validate:()=>{}});
  await career.write('t2_alice',{raw:'{"career":"keep"}',expectedGeneration:0});
  const config=dailyConfig(date);
  let a=await daily.act('t2_alice',{dailyId:config.id,action:'start'}),b=await daily.act('t2_bob',{dailyId:config.id,action:'start'});
  assert.deepEqual(progress(a),progress(b));
  for(let i=0;i<40&&!a.finished;i++){
    [a,b]=await Promise.all([step(daily,'t2_alice',a),step(daily,'t2_bob',b)]);
    assert.deepEqual(progress(a),progress(b));
    assert.deepEqual(progress(await daily.read('t2_alice')),progress(a));
  }
  assert.equal(a.resolved,30);assert.equal(a.finished,true);
  const automatic=(await daily.read('t2_alice')).leaderboard;assert.equal(automatic.total,2);assert.equal(automatic.score,a.score.total);assert.ok(automatic.position);
  assert.ok(a.score.total>=0&&a.score.total<=1000);assert.notEqual(a.score.total,999999);
  assert.equal((await career.read('t2_alice')).active,'{"career":"keep"}');
  assert.deepEqual(progress(await daily.act('t2_alice',{dailyId:config.id,action:'start'})),progress(a));
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,action:'command',command:{type:'choose',commandId:'after-finish',expectedRevision:a.view.revision,choiceId:'c0'}}),error=>error.status===400);
  const published=await daily.act('t2_alice',{dailyId:config.id,action:'publish',score:999999});
  assert.equal(published.leaderboard.total,2);assert.equal(published.leaderboard.score,a.score.total);
  assert.equal(published.leaderboard.rows.filter(row=>row.you).length,1);
  await daily.act('t2_alice',{dailyId:config.id,action:'publish'});
  assert.equal((await daily.read('t2_alice')).leaderboard.total,2);
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
  for(let i=0;i<40&&!practice.finished;i++)practice=await step(daily,'t2_alice',practice);
  assert.equal(practice.finished,true);assert.equal(practice.leaderboard,undefined);
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,mode:'practice',action:'publish'}),error=>error.status===400);
  assert.deepEqual(progress(await daily.read('t2_alice')),progress(competitive));
  assert.deepEqual(await daily.read('t2_alice','practice'),practice);
  const restarted=await daily.act('t2_alice',{dailyId:config.id,mode:'practice',action:'restart',expectedRevision:practice.view.revision});
  assert.equal(restarted.resolved,0);assert.equal(restarted.view.screen,'club');
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,mode:'practice',action:'restart',expectedRevision:practice.view.revision}),e=>e.status===409);
  await assert.rejects(daily.act('t2_alice',{dailyId:config.id,action:'restart',expectedRevision:competitive.view.revision}),e=>e.status===400);
  assert.deepEqual(progress(await daily.read('t2_alice')),progress(competitive));
});

test('Daily simulates six age stages, three club choices, recorded sporting totals and a final career',async()=>{
 const service=createDailyService({redis:createMemoryRedis(),now:()=>date});
 let state=await service.act('t2_player',{dailyId:dailyConfig(date).id,action:'start'});
 assert.equal(state.config.decisions,30);assert.equal(state.view.screen,'club');assert.equal(state.view.clubs.length,3);
 const stages=[];let clubs=0;
 for(let i=0;i<40&&!state.finished;i++){
  if(state.view.screen==='club'){clubs++;assert.equal(state.view.clubs.length,3);if(state.resolved)assert.equal(state.view.clubs.filter(c=>c.stay).length,1);}
  if(state.view.screen==='summary'){stages.push(state.view.summary);assert.equal(state.view.summary.played>=state.view.summary.starts,true);}
  state=await step(service,'t2_player',state);
 }
 stages.push(state.view.summary);assert.equal(clubs,6);assert.equal(state.view.age,38);assert.equal(state.resolved,30);
 assert.deepEqual(stages.map(s=>[s.from,s.to]),[[18,20],[20,23],[23,26],[26,30],[30,34],[34,38]]);
 for(const key of ['played','starts','goals','assists'])assert.equal(state.view.totals[key],stages.reduce((n,s)=>n+s[key],0));
 assert.ok(state.view.totals.played>0);assert.equal(state.view.history.length,30);
 assert.ok(Array.isArray(state.view.titles)&&Array.isArray(state.view.awards));
});
test('club spoofing and stale choices are rejected; retries do not advance twice',async()=>{
 const redis=createMemoryRedis(),service=createDailyService({redis,now:()=>date});
 const a=await service.act('t2_player',{dailyId:dailyConfig(date).id,action:'start'});
 const body={dailyId:a.config.id,action:'command',command:{type:'choose',choiceId:a.view.clubs[0].id,commandId:'retry',expectedRevision:a.view.revision}};
 await assert.rejects(service.act('t2_player',{...body,command:{...body.command,choiceId:'invented'}}),e=>e.status===400);
 const b=await service.act('t2_player',body);assert.deepEqual(progress(await service.act('t2_player',body)),progress(b));
 await assert.rejects(service.act('t2_player',{...body,command:{...body.command,commandId:'old'}}),e=>e.status===409);
 assert.deepEqual(progress(await service.read('t2_player')),progress(b));
});

test('different career strategies and clubs stay within save limits and reconcile actual fixtures',async()=>{
 const {newDailyRun,applyDailyCommand}=await import('../server/daily-run.mjs');
 for(const seed of [1,4,29,207,4294967295])for(const strategy of [0,1,2]){
  const run=newDailyRun({seed});
  for(let i=0;i<40&&!run.finished;i++){
   const p=run.pending,choice=p?.kind==='club'?p.clubs[strategy].id:p?.choices[strategy%p.choices.length].id;
   applyDailyCommand(run,{type:run.summaryPending?'acknowledge':'choose',choiceId:choice,commandId:String(i),expectedRevision:run.revision});
  }
  assert.equal(run.finished,true);assert.equal(run.resolved,30);
  assert.ok(Buffer.byteLength(JSON.stringify(run))<1_500_000);
  const matches=run.competitions.flatMap(c=>[...c.player.matches,...(c.cupPlayer?.matches??[])]);
  assert.equal(run.seasons.reduce((n,s)=>n+s.played,0),matches.filter(m=>m.player.appeared).length);
  assert.equal(run.seasons.reduce((n,s)=>n+s.goals,0),matches.reduce((n,m)=>n+m.stats.goals,0));
  assert.equal(run.seasons.reduce((n,s)=>n+s.assists,0),matches.reduce((n,m)=>n+m.stats.assists,0));
  assert.ok(run.state.sport.form>=0&&run.state.sport.form<=100);
 }
});

test('daily ranking shows own position outside Top 25, keeps ties deterministic and resets at UTC midnight',async()=>{
 const redis=createMemoryRedis();let now=date;const daily=createDailyService({redis,now:()=>now}),key=dailyConfig(now).id+':ranking';
 for(let i=0;i<28;i++)await redis.zAdd(key,{member:`t2_rank${String(i).padStart(2,'0')}`,score:1000-i});
 const a=await daily.read('t2_rank27'),b=await daily.read('t2_rank27');
 assert.deepEqual(a.leaderboard,b.leaderboard);assert.equal(a.leaderboard.total,28);assert.equal(a.leaderboard.rows.length,25);assert.equal(a.leaderboard.position,28);assert.equal(a.leaderboard.score,973);assert.ok(a.leaderboard.rows.every(row=>!row.you&&!('member' in row)));
 await redis.zAdd(key,{member:'t2_tie',score:1000});
 const tie=await daily.read('t2_tie');assert.equal(tie.leaderboard.position,tie.leaderboard.rows.find(row=>row.you).position);
 now=new Date('2026-10-04T00:00:00Z');const next=await daily.read('t2_rank27');assert.equal(next.leaderboard.total,0);assert.equal(next.leaderboard.position,null);assert.equal(next.leaderboard.score,null);
});
test('ranking failure after a confirmed finish preserves the Daily and is repaired on reload',async()=>{
 const redis=createMemoryRedis(),originalAdd=redis.zAdd;let fail=true;
 redis.zAdd=async(...args)=>{if(fail){fail=false;throw Error('ranking temporarily unavailable');}return originalAdd(...args);};
 const daily=createDailyService({redis,now:()=>date});let state=await daily.act('t2_recovery',{dailyId:dailyConfig(date).id,action:'start'}),failed=false;
 for(let i=0;i<40&&!state.finished;i++){try{state=await step(daily,'t2_recovery',state);}catch(error){assert.match(error.message,/ranking temporarily/);failed=true;break;}}
 assert.ok(failed);const restored=await daily.read('t2_recovery');assert.equal(restored.finished,true);assert.equal(restored.resolved,30);assert.equal(restored.leaderboard.total,1);assert.equal(restored.leaderboard.score,restored.score.total);
 const second=await daily.read('t2_recovery');assert.deepEqual(second,restored);assert.equal(second.leaderboard.total,1);
});

test('presentation metadata never enters a persisted Daily run and old runs still project',async()=>{
 const {newDailyRun,applyDailyCommand,dailyRunView}=await import('../server/daily-run.mjs');
 const run=newDailyRun({seed:207});
 applyDailyCommand(run,{type:'choose',choiceId:run.pending.clubs[0].id,commandId:'metadata-first',expectedRevision:run.revision});
 const before=JSON.stringify(run),view=dailyRunView(run);
 assert.equal(JSON.stringify(run),before);assert.equal(view.decision.eventId,run.pending.event.id);
 assert.equal(view.stage.stageId,0);assert.equal(Object.hasOwn(run,'stageId'),false);assert.equal(Object.hasOwn(run.pending,'eventId'),false);
 view.decision.choices[0].label='external presentation change';assert.equal(JSON.stringify(run),before);
 // Stored runs and history from before this feature have no presentation IDs.
 assert.equal(Object.hasOwn(run.history[0],'eventId'),false);
 assert.equal(dailyRunView(JSON.parse(before)).decision.eventId,run.pending.event.id);
 for(let i=0;i<5&&!run.summaryPending;i++){
  applyDailyCommand(run,{type:'choose',choiceId:run.pending.choices[0].id,commandId:'metadata-'+i,expectedRevision:run.revision});
 }
 assert.equal(run.summaryPending,true);const saved=JSON.stringify(run),hydrated=JSON.parse(saved),summaryView=dailyRunView(hydrated);
 assert.equal(JSON.stringify(hydrated),saved);
 assert.equal(summaryView.summary.stageId,0);assert.equal(summaryView.summaries[0].stageId,0);assert.equal(summaryView.nextStage.stageId,1);
 assert.equal(Object.hasOwn(run.summaries[0],'stageId'),false);assert.equal(JSON.stringify(run),saved);
});
