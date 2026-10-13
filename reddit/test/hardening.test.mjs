import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {GameSession} from '../../dist/session/game-session.js';
import {createInitialState} from '../../dist/content/initial-state.js';
import {FOOTBALL_CLUBS} from '../../dist/catalog/football/index.js';
import {proposeCareerChange} from '../../dist/simulation/offers.js';
import {createLeagueSeason,advanceLeagueSeason,careerCompetitionFixture,leagueStandings,reconciledCareerLeague} from '../shared/league-simulator.mjs';
import {createDailyService,dailyConfig} from '../server/daily-service.mjs';
import {newDailyRun,applyDailyCommand,dailyScore} from '../server/daily-run.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
import {requestJSON} from '../client/request-timeout.mjs';

const date=new Date('2026-10-05T12:00:00Z');
const step=(service,user,state)=>service.act(user,{dailyId:state.config.id,mode:state.mode,action:'command',command:{commandId:`hardening-${state.view.revision}`,expectedRevision:state.view.revision,type:state.view.screen==='summary'?'acknowledge':'choose',choiceId:state.view.screen==='club'?state.view.clubs[0].id:state.view.decision?.choices[0].id}});
test('seed 907 real foreign transfer keeps historical scores, reloads, and still rejects tampering',async()=>{
 const {beforeCommand,lastCommand}=JSON.parse(await readFile(new URL('./fixtures/career-907-before-foreign-transfer.json',import.meta.url),'utf8'));
 const session=await GameSession.resume(beforeCommand),historical=structuredClone(beforeCommand.state.world.sportMatchModel.fixtures);
 await session.dispatch(lastCommand);
 const saved=session.exportSnapshot();assert.equal(saved.state.club,'ENG_ROTHERHAM');assert.deepEqual(saved.state.world.sportMatchModel.fixtures,historical);
 assert.deepEqual((await GameSession.resume(saved)).getView(),session.getView());
 const bad=structuredClone(saved);bad.state.world.sportMatchModel.fixtures[0].result.homeGoals++;
 await assert.rejects(GameSession.resume(bad),e=>e.code==='INVALID_SAVE');
});
test('every catalog division completes two seasons before July, with no duplicate team dates',()=>{
 const clubs=[...new Map(FOOTBALL_CLUBS.map(c=>[`${c.countryCode}:${c.tier}`,c])).values()];
 for(const club of clubs)for(const year of [2026,2027]){
  const season=createLeagueSeason({seed:907,year,clubId:club.id,tier:club.tier,route:club.countryCode==='ESP'?'domestic':'abroad'}),n=season.teams.length;
  assert.equal(season.matches.length,n*(n-1));assert.ok(season.matches.every(m=>m.date<`${year+1}-07-01`));
  for(let i=0;i<n;i++){const matches=season.matches.filter(m=>m.home===i||m.away===i);assert.equal(new Set(matches.map(m=>m.date)).size,matches.length);}
  advanceLeagueSeason(season,`${year+1}-06-30`,{seed:907});assert.ok(season.closed);assert.ok(leagueStandings(season).every(r=>r.played===2*(n-1)));
 }
 const old=createLeagueSeason({seed:907,year:2026,clubId:FOOTBALL_CLUBS.find(c=>c.countryCode==='USA'&&c.tier===1).id,tier:1,route:'abroad',calendarVersion:1});
 assert.ok(old.matches.some(m=>m.date>'2027-07-01')); // Legacy calendars remain reconstructible.
});
test('new match influence uses frozen performance and standings reconcile actual score',async()=>{
 const session=await GameSession.create(907,{redditCompetitions:true});const state=session.exportSnapshot().state;
 const low={age:18,careerRole:'reserve',roleScore:0,form:0,fitness:0,fatigue:100,coachTrust:0,leagueTier:3,opponentLevel:60,positionIdentity:state.sport.positionIdentity};
 const high={...low,careerRole:'starter',roleScore:100,form:100,fitness:100,fatigue:0,coachTrust:100};
 const season=createLeagueSeason({seed:state.rngState.football.seed,year:2026,clubId:'UDV',tier:3});let improved=0;
 for(const m of season.matches.filter(m=>season.teams[m.home].id==='UDV'||season.teams[m.away].id==='UDV')){
  const a=careerCompetitionFixture(state,m.date,{performance:low,useRecorded:false}),b=careerCompetitionFixture(state,m.date,{performance:high,useRecorded:false});
  const key=a.fixture.homeAway==='home'?'homeGoals':'awayGoals';assert.ok(b.result[key]>=a.result[key]);if(b.result[key]>a.result[key])improved++;
 }
 assert.ok(improved>0);
 const fixture=careerCompetitionFixture(state,'2026-08-01',{performance:high,useRecorded:false});
 state.world.sportMatchModel={fixtures:[{...fixture.fixture,result:fixture.result}]};
 const league=reconciledCareerLeague(state),m=league.matches.find(m=>m.date===fixture.fixture.date&&(league.teams[m.home].id==='UDV'||league.teams[m.away].id==='UDV'));
 assert.equal(m.hg,fixture.result.homeGoals);assert.equal(m.ag,fixture.result.awayGoals);
});
test('new market offers after zero income provide a positive paid contract without changing current employment',()=>{
 const state=createInitialState(907);state.world.redditCompetitionFrom=state.date;state.contract.salaryMonthly=0;state.contract.monthsRemaining=0;
 const offer=proposeCareerChange(state,'Propuesta de mercado',s=>{s.club='ENG_ROTHERHAM';s.professional.registrationClub=s.club;s.professional.route='abroad';});
 assert.ok(offer.terms.salary>0);assert.ok(offer.terms.months>=24);assert.equal(state.contract.salaryMonthly,0);
});
test('v4 Daily packs server saves, reconciles completed seasons, syncs role and isolates practice',async t=>{
 const redis=createMemoryRedis(),service=createDailyService({redis,now:()=>date}),config=dailyConfig(date);
 assert.equal(config.rulesVersion,4);assert.equal(dailyConfig(new Date('2026-10-04T23:59:59Z')).rulesVersion,3);
 let state=await service.act('t2_hardening',{dailyId:config.id,action:'start'});
 const practice=await service.act('t2_hardening',{dailyId:config.id,mode:'practice',action:'start'});
 const key=`${config.id}:career:v1:t2_hardening`,practiceKey=`practice:${key}`;
 const unpack=async key=>JSON.parse(inflateSync(Buffer.from((await redis.get(key)).slice(3),'base64')).toString());
 assert.notEqual(JSON.parse((await unpack(key)).active).seed,JSON.parse((await unpack(practiceKey)).active).seed);
 for(let i=0;i<40&&!state.finished;i++){
  state=await step(service,'t2_hardening',state);
  const run=JSON.parse((await unpack(key)).active);assert.equal(run.state.role,run.state.sport.roleScore>=65?'starter':run.state.sport.roleScore>=40?'rotation':'reserve');
  const {leaderboard,...restored}=await service.read('t2_hardening');const {leaderboard:ignored,...current}=state;assert.deepEqual(restored,current);
 }
 const packed=await redis.get(key),record=await unpack(key),run=JSON.parse(record.active);
 assert.equal(record.previous,null);assert.equal(run.version,4);assert.ok(run.competitions.every(c=>c.closed));assert.ok(run.competitions.every(c=>c.ageingApplied));assert.ok(run.state.body.fitness<95);
 t.diagnostic(JSON.stringify({rawBytes:Buffer.byteLength(record.active),storedBytes:Buffer.byteLength(packed)}));
 assert.ok(Buffer.byteLength(packed)<400_000);assert.equal(state.score.total,dailyScore(run.state,run).total);
 // Corrupt compressed bytes never silently replace a saved attempt.
 await redis.set(key,'z1:broken');await assert.rejects(service.read('t2_hardening'),e=>e.status===500);assert.equal(await redis.get(key),'z1:broken');
 await redis.set(key,JSON.stringify(record));assert.deepEqual(await service.read('t2_hardening'),state); // Plaintext migration.
});
test('leaderboard retries the reproduced concurrent finisher race and returns consistent own rank',async()=>{
 const redis=createMemoryRedis(),key=dailyConfig(date).id+':ranking';await redis.zAdd(key,{member:'t2_alice',score:500});
 const original=redis.zRange;let injected=false;
 redis.zRange=async(...args)=>{const rows=await original(...args);if(!injected&&args[2]===24){injected=true;await redis.zAdd(key,{member:'t2_bob',score:900});}return rows;};
 const result=await createDailyService({redis,now:()=>date}).read('t2_alice'),board=result.leaderboard;
 assert.equal(board.total,2);assert.equal(board.rows.length,2);assert.equal(board.position,board.rows.find(r=>r.you).position);assert.equal(board.position,2);
});
test('JSON deadline covers hanging headers and body, aborts, and never retries a write',async()=>{
 for(const body of [false,true]){let calls=0,signal;await assert.rejects(requestJSON('/api/daily',{method:'POST'},{timeoutMs:10,fetcher:async(_url,options)=>{calls++;signal=options.signal;if(body)return {json:()=>new Promise(()=>{})};return new Promise(()=>{});}}),/recupera/);assert.equal(calls,1);assert.ok(signal.aborted);}
});

test('a deployment after midnight preserves an already started v3 attempt and its ranking namespace',async()=>{
 const redis=createMemoryRedis(),legacy=dailyConfig(date,3),run=newDailyRun(legacy),key=`${legacy.id}:career:v1:t2_upgrade`;
 await redis.set(key,JSON.stringify({version:1,generation:1,active:JSON.stringify(run),previous:null}));
 const service=createDailyService({redis,now:()=>date}),view=await service.read('t2_upgrade');
 assert.equal(view.config.id,legacy.id);assert.equal(view.config.rulesVersion,3);
 await assert.rejects(service.act('t2_upgrade',{dailyId:dailyConfig(date).id,action:'start'}),e=>e.status===409);
 const next=await step(service,'t2_upgrade',view);assert.equal(next.config.id,legacy.id);assert.equal(next.resolved,1);
 assert.equal(await redis.get(`${dailyConfig(date).id}:career:v1:t2_upgrade`),undefined);
});

test('competing v4 choices commit once through compressed WATCH/EXEC and recover the winning revision',async()=>{
 const service=createDailyService({redis:createMemoryRedis(),now:()=>date}),user='t2_race',start=await service.act(user,{dailyId:dailyConfig(date).id,action:'start'});
 const actions=start.view.clubs.slice(0,2).map((club,i)=>({dailyId:start.config.id,action:'command',command:{commandId:`racer-${i}`,type:'choose',choiceId:club.id,expectedRevision:start.view.revision}}));
 const results=await Promise.allSettled(actions.map(body=>service.act(user,body)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const error=results.find(r=>r.status==='rejected').reason;assert.equal(error.status,409);
 const recovered=await service.read(user);assert.equal(recovered.resolved,1);assert.equal(recovered.view.revision,1);
 const winner=results.findIndex(r=>r.status==='fulfilled');const retry=await service.act(user,actions[winner]);assert.equal(retry.resolved,1);assert.equal(retry.view.revision,1);
});
