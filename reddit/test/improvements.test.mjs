import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../../dist/content/initial-state.js';
import {playerStatsForFixture} from '../../dist/simulation/match-model.js';
import {FOOTBALL_CLUBS} from '../../dist/catalog/football/index.js';
import {createLeagueSeason,advanceLeagueSeason,leagueStandings,leagueRivals,seasonHonours,leagueHash} from '../shared/league-simulator.mjs';
import {createLiveContinentalSeason,advanceLiveContinentalSeason,publicLiveContinentalSeason} from '../shared/continental-live.mjs';
import {createDailyStory,rememberDailyChoice,settleDailyPromises} from '../server/daily-stories.mjs';
import {newDailyRun,applyDailyCommand,dailyRunView} from '../server/daily-run.mjs';
import * as frozenV4 from '../server/daily-run-v4.mjs';
import {createDailyService,dailyConfig} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';

const choose=(run,index=0)=>{const p=run.pending;return {type:run.summaryPending?'acknowledge':'choose',choiceId:p?.kind==='club'?p.clubs[index].id:p?.choices[index%p.choices.length].id,commandId:`improve-${run.revision}`,expectedRevision:run.revision};};
const memory=()=>({family:50,mentor:0,promises:[],callbacks:[],choices:[]});
test('old v4 runs retain byte-identical simulation, views and receipts through the new dispatcher',()=>{
 const a=newDailyRun({seed:907,rulesVersion:4}),b=frozenV4.newDailyRun({seed:907});
 for(let i=0;i<40&&!a.finished;i++){const command=choose(a,i%3);applyDailyCommand(a,command);frozenV4.applyDailyCommand(b,command);assert.deepEqual(a,b);assert.deepEqual(dailyRunView(a),frozenV4.dailyRunView(b));}
 assert.ok(a.finished);
});
test('family and mentoring commitments come back, resolve once and alter later personal consequences',()=>{
 for(const fulfill of [false,true]){
  const run={seed:7,stage:0,resolved:2,state:createInitialState(7),narrative:memory()};
  const event=createDailyStory(run,{phase:'18_20',from:18,to:20,name:'Primeros pasos'},leagueHash),protect=event.choices.find(c=>c.arc==='protect');
  rememberDailyChoice(run,event,protect.id);assert.equal(run.narrative.promises.length,1);
  run.stage=1;run.resolved=7;
  const callback=createDailyStory(run,{phase:'20_23',from:20,to:23,name:'Hacerse un sitio'},leagueHash);assert.match(callback.text.title,/^La visita que prometiste/);
  rememberDailyChoice(run,callback,callback.choices.find(c=>c.arc===(fulfill?'protect':'football')).id);
  const before=run.state.control.career;settleDailyPromises(run);assert.equal(run.narrative.promises[0].status,fulfill?'fulfilled':'broken');assert.equal(run.state.control.career,before+(fulfill?3:-2));
  const once=JSON.stringify(run);settleDailyPromises(run);assert.equal(JSON.stringify(run),once);
 }
});
test('v5 squads account for every goal and minute, expose sixteen rivals per team and exclude inactive award candidates',()=>{
 const season=createLeagueSeason({seed:42,year:2026,clubId:'UDV',tier:3,sportsVersion:2}),state=createInitialState(42);state.sport.roleScore=90;
 advanceLeagueSeason(season,'2027-06-30',{seed:42,playerState:state,producePlayerStats:playerStatsForFixture});
 const rivals=leagueRivals(season);assert.equal(rivals.length,season.teams.length*16);
 for(const team of season.teams){const roster=rivals.filter(r=>r.club===team.id),own=team.id===season.clubId;assert.equal(roster.reduce((n,r)=>n+r.goals,0)+(own?season.player.goals:0),team.gf);assert.equal(roster.reduce((n,r)=>n+r.minutes,0)+(own?season.player.minutes:0),team.played*990);assert.ok(roster.every(r=>r.minutes<=r.played*90));assert.equal(roster.find(r=>r.position==='goalkeeper').goals,0);}
 const backup=structuredClone(season);backup.player.minutes=899;assert.deepEqual(seasonHonours(backup).awards,[]);
 const saved=structuredClone(season);advanceLeagueSeason(season,'2027-06-30',{seed:42,playerState:state,producePlayerStats:playerStatsForFixture});assert.deepEqual(season,saved);
});
function cupSetup(seed){
 const base=createLiveContinentalSeason({seed,year:2026,clubId:'UDV'}),club=FOOTBALL_CLUBS.find(c=>c.id===base.teams[0].id),cup=createLiveContinentalSeason({seed,year:2026,clubId:club.id});
 const state=createInitialState(seed);Object.assign(state.professional,{registrationClub:club.id,leagueTier:1,route:club.countryCode==='ESP'?'domestic':'abroad'});state.club=club.id;
 const league=createLeagueSeason({seed,year:2026,clubId:club.id,tier:1,route:state.professional.route,sportsVersion:2});return {cup,league,state,options:{seed,playerState:state,producePlayerStats:playerStatsForFixture}};
}
test('live continental cup reveals no future scores, branches from played groups, and survives incremental reload',()=>{
 const setup=cupSetup(81),{cup,league,options}=setup;
 const before=publicLiveContinentalSeason(cup,'2026-07-01');assert.equal(before.winner,null);assert.ok(before.matches.every(m=>m.hg===null&&!('winner' in m)));assert.equal(cup.matches.length,96);
 advanceLiveContinentalSeason(league,cup,'2026-12-31',options);assert.equal(cup.matches.filter(m=>m.stage==='Octavos').length,16);assert.ok(cup.teams.every(t=>t.played===6));
 const dates=league.matches.filter(m=>league.teams[m.home].id===cup.clubId||league.teams[m.away].id===cup.clubId).map(m=>m.date);assert.ok(cup.matches.filter(m=>cup.teams[m.home].id===cup.clubId||cup.teams[m.away].id===cup.clubId).every(m=>!dates.includes(m.date)));
 const copy=structuredClone({cup,league,state:setup.state});
 advanceLiveContinentalSeason(league,cup,'2027-06-30',options);advanceLiveContinentalSeason(copy.league,copy.cup,'2027-06-30',{seed:options.seed,playerState:copy.state,producePlayerStats:playerStatsForFixture});assert.deepEqual(copy.cup,cup);assert.deepEqual(copy.league,league);assert.deepEqual(copy.state,setup.state);
 assert.ok(cup.closed);assert.equal(cup.matches.filter(m=>m.stage==='Final').length,1);assert.equal(cup.matches.at(-1).winner,cup.winner);
 for(const stage of ['Octavos','Cuartos','Semifinal']){const phase=cup.matches.filter(m=>m.stage===stage);for(const tie of new Set(phase.map(m=>m.tie))){const [a,b]=phase.filter(m=>m.tie===tie);const hg=a.hg+b.ag,ag=a.ag+b.hg;if(hg!==ag)assert.equal(b.winner,hg>ag?a.home:a.away);else assert.ok(b.penalties);}}
 const snapshot=JSON.stringify(cup);advanceLiveContinentalSeason(league,cup,'2027-06-30',options);assert.equal(JSON.stringify(cup),snapshot);
});
test('live cup performance can change actual scores, and every player record agrees with the played match',()=>{
 let changes=0;
 for(const seed of [1,7,21,81]){
  const a=cupSetup(seed),b=cupSetup(seed);Object.assign(a.state.sport,{form:10,roleScore:5});a.state.body.fitness=20;a.state.professional.technique=10;
  Object.assign(b.state.sport,{form:100,roleScore:100});b.state.body.fitness=100;b.state.professional.technique=100;
  advanceLiveContinentalSeason(a.league,a.cup,'2026-12-31',a.options);advanceLiveContinentalSeason(b.league,b.cup,'2026-12-31',b.options);
  for(const m of b.cup.matches.filter(m=>m.group!==undefined)){const previous=a.cup.matches.find(n=>n.round===m.round&&n.home===m.home&&n.away===m.away);if(m.hg!==previous.hg||m.ag!==previous.ag)changes++;}
  for(const record of b.league.cupPlayer.matches){const match=b.cup.matches.find(m=>m.date===record.date&&(b.cup.teams[m.home].id===b.cup.clubId||b.cup.teams[m.away].id===b.cup.clubId));assert.equal(record.result.homeGoals,match.hg);assert.equal(record.result.awayGoals,match.ag);assert.ok(record.stats.goals<=(b.cup.teams[match.home].id===b.cup.clubId?match.hg:match.ag));}
 }
 assert.ok(changes>0);
});
test('full v5 career resolves all competitions and promises, reconciles totals and fits packed save budget',()=>{
 const run=newDailyRun({seed:907,rulesVersion:5});for(let i=0;i<40&&!run.finished;i++){const command=choose(run,i%3);applyDailyCommand(run,command);const snapshot=JSON.stringify(run);applyDailyCommand(run,command);assert.equal(JSON.stringify(run),snapshot);assert.deepEqual(dailyRunView(JSON.parse(snapshot)),dailyRunView(run));}
 assert.ok(run.finished);assert.ok(run.competitions.every(c=>c.closed));assert.ok(run.cups.every(c=>c.closed));assert.ok(run.narrative.promises.every(p=>p.status!=='pending'));assert.ok(Buffer.byteLength(JSON.stringify(run))<2_000_000);
 const records=run.competitions.flatMap(c=>[...c.player.matches,...c.cupPlayer.matches]);assert.equal(run.seasons.reduce((n,s)=>n+s.played,0),records.filter(m=>m.player.appeared).length);assert.equal(run.seasons.reduce((n,s)=>n+s.goals,0),records.reduce((n,m)=>n+m.stats.goals,0));
});
test('new v5 service keeps current-day v4 and v3 attempts under their original rules',async()=>{
 const now=new Date('2026-10-06T12:00:00Z');assert.equal(dailyConfig(now).rulesVersion,5);
 for(const version of [3,4]){
  const redis=createMemoryRedis(),config=dailyConfig(now,version),run=newDailyRun(config),key=`${config.id}:career:v1:t2_prior`;
  await redis.set(key,JSON.stringify({version:1,generation:1,active:JSON.stringify(run),previous:null}));
  const service=createDailyService({redis,now:()=>now}),view=await service.read('t2_prior');assert.equal(view.config.rulesVersion,version);assert.equal(view.resolved,0);
  await assert.rejects(service.act('t2_prior',{dailyId:dailyConfig(now).id,action:'start'}),e=>e.status===409);
 }
});

test('new practice saves retain one extra day while competitive saves keep the seven-day recovery window',async()=>{
 const base=createMemoryRedis(),expirations=new Map(),originalWatch=base.watch;
 base.watch=async key=>{const txn=await originalWatch(key);return {...txn,set:(k,v,options)=>{expirations.set(k,options.expiration.toISOString());return txn.set(k,v);}};};
 const now=new Date('2026-10-06T12:00:00Z'),service=createDailyService({redis:base,now:()=>now}),config=dailyConfig(now);
 await service.act('t2_ttl',{dailyId:config.id,action:'start'});await service.act('t2_ttl',{dailyId:config.id,mode:'practice',action:'start'});
 assert.equal(expirations.get(`${config.id}:career:v1:t2_ttl`),'2026-10-14T00:00:00.000Z');assert.equal(expirations.get(`practice:${config.id}:career:v1:t2_ttl`),'2026-10-08T00:00:00.000Z');
});

test('live qualification uses actual prior league positions and explicit slots for all ten countries',()=>{
 const club=FOOTBALL_CLUBS.find(c=>c.countryCode==='NOR'&&c.tier===1),previous=createLeagueSeason({seed:91,year:2026,clubId:club.id,tier:1,route:'abroad',sportsVersion:2});advanceLeagueSeason(previous,'2027-06-30',{seed:91});
 const cup=createLiveContinentalSeason({seed:91,year:2027,clubId:club.id,previousLeague:previous});assert.equal(cup.teams.length,32);assert.equal(new Set(cup.teams.map(t=>t.id)).size,32);
 for(const [country,count]of Object.entries({ESP:4,ENG:4,ITA:4,DEU:4,FRA:4,PRT:4,NLD:2,BEL:2,TUR:2,NOR:2}))assert.equal(cup.teams.filter(t=>FOOTBALL_CLUBS.find(c=>c.id===t.id).countryCode===country).length,count);
 const expected=leagueStandings(previous).slice(0,2).map(t=>t.id).sort(),actual=cup.teams.filter(t=>FOOTBALL_CLUBS.find(c=>c.id===t.id).countryCode==='NOR').map(t=>t.id).sort();assert.deepEqual(actual,expected);
});

test('an incomplete v5 save is rejected without overwriting the confirmed raw record',async()=>{
 const redis=createMemoryRedis(),now=new Date('2026-10-06T12:00:00Z'),config=dailyConfig(now),key=`${config.id}:career:v1:t2_corrupt`;
 const raw=JSON.stringify({version:1,generation:1,active:JSON.stringify({version:5,resolved:1,state:{},summaries:[]}),previous:null});await redis.set(key,raw);
 await assert.rejects(createDailyService({redis,now:()=>now}).read('t2_corrupt'),error=>error.status===500&&/conserva/.test(error.message));assert.equal(await redis.get(key),raw);
});
