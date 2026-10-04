import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createLeagueSeason,advanceLeagueSeason,leagueStandings,seasonHonours,createContinentalSeason,publicContinentalSeason,careerCompetitionFixture} from '../shared/league-simulator.mjs';
import {createInitialState} from '../../dist/content/initial-state.js';
import {FOOTBALL_CLUBS} from '../../dist/catalog/football/index.js';
import {advanceWorldDayInPlace} from '../../dist/simulation/world-simulator.js';
import {isOfficialMatchDay,recordOfficialMatchInPlace} from '../../dist/simulation/match-model.js';
import {GameSession} from '../../dist/session/game-session.js';
import {respondToOffer} from '../../dist/simulation/offers.js';
import {projectCareerSports} from '../client/career-sports.mjs';

test('complete league has two legs, one match per team per round and reconciled results',()=>{
 const season=createLeagueSeason({seed:71,year:2026,clubId:'UDV',tier:3}),n=season.teams.length;
 assert.equal(season.matches.length,n*(n-1));
 const pairs=new Map();for(const m of season.matches){assert.notEqual(m.home,m.away);const key=`${m.home}:${m.away}`;pairs.set(key,(pairs.get(key)??0)+1);assert.equal(new Date(m.date).getUTCDay(),6);}
 for(let team=0;team<n;team++){let side,last=0;for(const m of season.matches.filter(m=>m.home===team||m.away===team)){const next=m.home===team;last=next===side?last+1:1;side=next;assert.ok(last<=3,"Unbalanced run of home/away matches");}}
 assert.equal(pairs.size,n*(n-1));assert.ok([...pairs.values()].every(n=>n===1));
 for(let r=1;r<=2*(n-1);r++){const ids=season.matches.filter(m=>m.round===r).flatMap(m=>[m.home,m.away]);assert.equal(new Set(ids).size,n);}
 advanceLeagueSeason(season,'2027-06-30',{seed:71});const table=leagueStandings(season);
 assert.ok(table.every(r=>r.played===2*(n-1)&&r.points===r.won*3+r.drawn));assert.equal(table.reduce((n,r)=>n+r.gf,0),table.reduce((n,r)=>n+r.ga,0));
 const draws=season.matches.filter(m=>m.hg===m.ag).length;assert.equal(table.reduce((n,r)=>n+r.points,0),season.matches.length*3-draws);
 assert.deepEqual(seasonHonours({...season,clubId:table.at(-1).id,player:{played:38}}).titles,[]);
 assert.deepEqual(seasonHonours({...season,clubId:table[0].id,player:{played:1}}).titles,['Campeón de liga']);
 const again=structuredClone(season);advanceLeagueSeason(season,'2027-06-30',{seed:71});assert.deepEqual(season,again);
});
test('clubs do not automatically win and successive seasons have different scores',()=>{
 let wins=0,previous;
 for(let seed=1;seed<=12;seed++){const s=createLeagueSeason({seed,year:2026,clubId:'UDV',tier:3});advanceLeagueSeason(s,'2027-06-30',{seed});if(leagueStandings(s)[0].id==='UDV')wins++;const scores=s.matches.map(m=>[m.hg,m.ag]);if(previous)assert.notDeepEqual(scores,previous);previous=scores;}
 assert.ok(wins<6,`Unexpected ${wins}/12 league wins`);
});
test('continental qualifiers, group totals and aggregate knockouts agree; no future score leaks',()=>{
 const cup=createContinentalSeason({seed:81,year:2026,clubId:'UDV'});assert.equal(cup.qualified,false);assert.equal(cup.teams.length,32);assert.ok(cup.teams.every(t=>['ESP','ENG','ITA','DEU','FRA','PRT','NLD','BEL','TUR','NOR'].includes(FOOTBALL_CLUBS.find(c=>c.id===t.id).countryCode)));
 assert.equal(new Set(cup.teams.map(t=>t.id)).size,32);assert.equal(cup.matches.filter(m=>m.group!==undefined).length,96);
 assert.ok(cup.teams.every(t=>t.played===6));assert.equal(cup.matches.filter(m=>m.stage==='Final').length,1);
 for(const stage of ['Octavos','Cuartos','Semifinal']){const games=cup.matches.filter(m=>m.stage===stage);for(let i=0;i<games.length;i+=2){const a=games[i],b=games[i+1];assert.equal(a.home,b.away);assert.equal(a.away,b.home);const hg=a.hg+b.ag,ag=a.ag+b.hg;if(hg!==ag)assert.equal(b.winner,hg>ag?a.home:a.away);else {assert.ok(b.penalties);assert.equal(b.penalties.home>b.penalties.away,b.winner===b.home);}}}
 const before=publicContinentalSeason(cup,'2026-07-01');assert.deepEqual(before.matches,[]);assert.equal(before.winner,null);
 const final=cup.matches.at(-1);assert.equal(final.winner,cup.winner);assert.ok(cup.teams[cup.winner]);
});
test('long career records coherent league rounds; save/load preserves the next fixture and exact results',async()=>{
 const session=await GameSession.create(71,{redditCompetitions:true});const state=session.exportSnapshot().state;state.date='2026-07-31';state.runtime.day=30;
 for(let i=0;i<70;i++)advanceWorldDayInPlace(state);
 const facts=state.world.sportMatchModel.fixtures;assert.ok(facts.length>=9);assert.equal(new Set(facts.map(m=>m.id)).size,facts.length);
 for(const m of facts){const at={...state,season:m.season,professional:{...state.professional,registrationClub:m.club}};assert.deepEqual(m.result,careerCompetitionFixture(at,m.date).result);}
 const sports=projectCareerSports(state);assert.ok(sports.rows.every(r=>r.played===facts.filter(m=>m.competition==='league').length));assert.equal(sports.recent.length,1);
 const snapshot=session.exportSnapshot();snapshot.state=state;snapshot.needsWorldAdvance=false;
 const restored=await GameSession.resume(snapshot);assert.deepEqual(restored.exportSnapshot().state,state);assert.deepEqual(projectCareerSports(restored.exportSnapshot().state),sports);
});
test('long continental fixtures do not collide with league dates across seasons and record official player facts',()=>{
 const candidate=createContinentalSeason({seed:81,year:2026,clubId:'UDV'}).teams[0].id;
 for(const year of [2026,2027,2028,2029,2030]){const state=createInitialState(81),club=FOOTBALL_CLUBS.find(c=>c.id===candidate);state.season=`${year}-${String(year+1).slice(-2)}`;state.professional.registrationClub=club.id;state.professional.leagueTier=1;state.professional.route=club.countryCode==='ESP'?'domestic':'abroad';state.world.redditCompetitionFrom='2026-07-01';
  const league=createLeagueSeason({seed:state.rngState.football.seed,year,clubId:club.id,tier:1,route:state.professional.route}),cup=createContinentalSeason({seed:state.rngState.football.seed,year,clubId:club.id});
  const dates=league.matches.filter(m=>league.teams[m.home].id===club.id||league.teams[m.away].id===club.id).map(m=>m.date);for(const m of cup.matches.filter(m=>cup.teams[m.home].id===club.id||cup.teams[m.away].id===club.id))assert.ok(!dates.includes(m.date));
  if(cup.qualified){const m=cup.matches.find(m=>cup.teams[m.home].id===club.id||cup.teams[m.away].id===club.id);state.date=m.date;assert.equal(isOfficialMatchDay(state),true);const record=recordOfficialMatchInPlace(state,{appeared:true,debutOccurred:false,injuryUnavailable:false});assert.equal(record.competition,'champions');}
 }
});
test('manual Reddit advance stops after a single round instead of skipping a season',async()=>{
 const session=await GameSession.create(71,{redditCompetitions:true,events:[]});
 await session.dispatch({type:'continue',maxDays:90,commandId:'first-round',expectedRevision:0});
 assert.equal(session.exportSnapshot().state.world.sportMatchModel.fixtures.length,1);
 await session.dispatch({type:'continue',maxDays:90,commandId:'second-round',expectedRevision:1});
 assert.equal(session.exportSnapshot().state.world.sportMatchModel.fixtures.length,2);
 const copy=await GameSession.resume(session.exportSnapshot(),{events:[]});assert.deepEqual(copy.getView(),session.getView());
});
test('multi-season session saves retain historical results after real contract decisions',async()=>{
 const session=await GameSession.create(71,{redditCompetitions:true,events:[]});
 for(let i=0;i<180&&session.getView().date<'2028-07-01';i++){
  const v=session.getView();await session.dispatch({commandId:`two-years-${i}`,expectedRevision:v.revision,...(v.offer?{type:'offer',offerId:v.offer.id,action:'accept'}:{type:'continue',maxDays:90})});
 }
 assert.ok(session.getView().date>='2028-07-01');
 const snapshot=session.exportSnapshot(),resumed=await GameSession.resume(snapshot,{events:[]});
 assert.deepEqual(resumed.getView(),session.getView());assert.ok(new Set(snapshot.state.world.sportMatchModel.fixtures.map(m=>m.season)).size>=2);
});
