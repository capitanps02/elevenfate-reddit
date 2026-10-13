import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../../dist/content/initial-state.js';
import {playerStatsForFixture,balancedPlayerStatsForFixture} from '../../dist/simulation/match-model.js';
import {createLeagueSeason,advanceLeagueSeason,leagueRivals} from '../shared/league-simulator.mjs';
import {newDailyRun,applyDailyCommand,dailyRunView,dailyScore} from '../server/daily-run.mjs';
import * as frozenV5 from '../server/daily-run-v5.mjs';
import {serializeDailyRun,hydrateDailyArchive} from '../server/daily-archive.mjs';
import {createDailyService,dailyConfig} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
const command=run=>({commandId:`balance-${run.revision}`,expectedRevision:run.revision,type:run.summaryPending?'acknowledge':'choose',choiceId:run.pending?.kind==='club'?run.pending.clubs[run.revision%3].id:run.pending?.choices[run.revision%3].id});
test('v5 dispatcher preserves the frozen complete career and all historical results',()=>{
 const a=newDailyRun({seed:907,rulesVersion:5}),b=frozenV5.newDailyRun({seed:907,rulesVersion:5});while(!a.finished){const c=command(a);applyDailyCommand(a,c);frozenV5.applyDailyCommand(b,c);assert.deepEqual(a,b);assert.deepEqual(dailyRunView(a),frozenV5.dailyRunView(b));}assert.deepEqual(dailyScore(a.state,a),frozenV5.dailyScore(b.state,b));
});
test('new attribution respects minutes and position, preserves discipline and produces coherent bounded ratings',()=>{
 const state=createInitialState(42),result={homeGoals:3,awayGoals:1,outcome:'win'},totals={};
 for(const position of ['goalkeeper','centre_back','central_midfielder','winger','striker']){
  let goals=0;
  for(let i=0;i<1000;i++){
   const fixture={id:`sample-${i}`,date:'2026-08-01',season:'2026-27',competition:'league',club:'UDV',opponentClubId:'OTHER',homeAway:'home',official:true},context={roleScore:85,form:70,fitness:80,fatigue:12,opponentLevel:65,positionIdentity:position},fact={appeared:true,started:true,minutes:90};
   const full=balancedPlayerStatsForFixture(state,fixture,fact,result,context),short=balancedPlayerStatsForFixture(state,fixture,{...fact,minutes:12},result,context),old=playerStatsForFixture(state,fixture,fact,result,context);
   assert.ok(full.goals>=short.goals);assert.ok(full.goals+full.assists<=3);assert.ok(full.rating>=3.5&&full.rating<=10);assert.equal(full.yellowCards,old.yellowCards);assert.equal(full.redCards,old.redCards);goals+=full.goals;
  }totals[position]=goals;
 }assert.equal(totals.goalkeeper,0);assert.ok(totals.centre_back<totals.central_midfielder);assert.ok(totals.central_midfielder<totals.winger);assert.ok(totals.winger<totals.striker);
 assert.deepEqual(balancedPlayerStatsForFixture(state,{}, {appeared:false},result,{}),{goals:0,assists:0,yellowCards:0,redCards:0});
});
test('variable substitutions account for every minute and goal and activate the whole sixteen-player roster',()=>{
 const season=createLeagueSeason({seed:42,year:2026,clubId:'UDV',tier:3,sportsVersion:3}),state=createInitialState(42);state.sport.roleScore=90;
 advanceLeagueSeason(season,'2027-06-30',{seed:42,playerState:state,producePlayerStats:balancedPlayerStatsForFixture});
 const rivals=leagueRivals(season);for(const team of season.teams){const squad=rivals.filter(r=>r.club===team.id),own=team.id===season.clubId;assert.equal(squad.reduce((n,r)=>n+r.goals,0)+(own?season.player.goals:0),team.gf);assert.equal(squad.reduce((n,r)=>n+r.minutes,0)+(own?season.player.minutes:0),team.played*990);assert.ok(squad.every(r=>r.minutes<=r.played*90));assert.ok(squad.filter(r=>r.position==='goalkeeper').every(r=>r.goals===0));}
 assert.ok(rivals.some(r=>r.id.endsWith(':11')&&r.played>0));assert.ok(rivals.some(r=>r.id.endsWith(':15')&&r.played>0));
 const before=structuredClone(season);advanceLeagueSeason(season,'2027-06-30',{seed:42,playerState:state,producePlayerStats:balancedPlayerStatsForFixture});assert.deepEqual(season,before);
});
test('changing only the rival model keeps fixtures, results and player evolution equal',()=>{
 const states=[createInitialState(81),createInitialState(81)],seasons=[2,3].map(sportsVersion=>createLeagueSeason({seed:81,year:2026,clubId:'UDV',tier:3,sportsVersion}));for(let i=0;i<2;i++)advanceLeagueSeason(seasons[i],'2027-06-30',{seed:81,playerState:states[i],producePlayerStats:playerStatsForFixture});assert.deepEqual(seasons[0].matches,seasons[1].matches);assert.deepEqual(seasons[0].player,seasons[1].player);assert.deepEqual(states[0],states[1]);
});
test('v6 closes twenty seasons and cups and preserves every view through compact reloads',()=>{
 let run=newDailyRun({seed:907,rulesVersion:6});assert.equal(run.version,6);
 while(!run.finished){const c=command(run);applyDailyCommand(run,c);const before=structuredClone(run);run=hydrateDailyArchive(JSON.parse(serializeDailyRun(run)));assert.deepEqual(run,before);for(const s of run.competitions)assert.deepEqual(dailyRunView(run,s.id),dailyRunView(before,s.id));applyDailyCommand(run,c);assert.deepEqual(run,before);}
 assert.equal(run.competitions.length,20);assert.ok(run.competitions.every(s=>s.sportsVersion===3&&s.closed));assert.ok(run.cups.every(s=>s.closed));assert.ok(run.narrative.promises.every(p=>p.status!=='pending'));assert.ok(Buffer.byteLength(serializeDailyRun(run))<2_000_000);
});
test('v6 starts only from its UTC boundary and current-day v5 attempts remain on their original rules',async()=>{
 assert.equal(dailyConfig(new Date('2026-10-06T23:59:59Z')).rulesVersion,5);assert.equal(dailyConfig(new Date('2026-10-07T00:00:00Z')).rulesVersion,6);
 const redis=createMemoryRedis(),now=new Date('2026-10-07T12:00:00Z'),prior=dailyConfig(now,5),run=newDailyRun(prior),key=`${prior.id}:career:v1:t2_priorfive`;await redis.set(key,JSON.stringify({version:1,generation:1,active:serializeDailyRun(run),previous:null}));const service=createDailyService({redis,now:()=>now});assert.equal((await service.read('t2_priorfive')).config.rulesVersion,5);await assert.rejects(service.act('t2_priorfive',{dailyId:dailyConfig(now).id,action:'start'}),error=>error.status===409);
 const fresh=await service.act('t2_freshsix',{dailyId:dailyConfig(now).id,action:'start'});assert.equal(fresh.config.rulesVersion,6);assert.deepEqual((await service.read('t2_freshsix')).view,fresh.view);
});

test('wing-back aliases use full-back contributions rather than winger contributions',()=>{
 const state=createInitialState(42),fixture={id:'position-alias',date:'2026-08-01',season:'2026-27',club:'UDV',homeAway:'home'},fact={appeared:true,minutes:90},result={homeGoals:3,awayGoals:1,outcome:'win'},context={roleScore:85,form:70,fitness:80,fatigue:12,opponentLevel:65};
 const expected=balancedPlayerStatsForFixture(state,fixture,fact,result,{...context,positionIdentity:'full_back'});
 for(const position of ['wing_back','wing-back','full back','lateral'])assert.deepEqual(balancedPlayerStatsForFixture(state,fixture,fact,result,{...context,positionIdentity:position}),expected);
});
