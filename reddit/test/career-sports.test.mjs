import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../../dist/content/initial-state.js';
import {recordOfficialMatchInPlace} from '../../dist/simulation/match-model.js';
import {projectCareerSports} from '../client/career-sports.mjs';
test('calendar and simulated table are deterministic and never change career or RNG',()=>{
 const state=createInitialState(71),before=structuredClone(state);
 const a=projectCareerSports(state),b=projectCareerSports(state);
 assert.deepEqual(a,b);assert.deepEqual(state,before);assert.equal(a.position,null);assert.equal(a.played,0);
 assert.ok(a.upcoming.length>0);assert.ok(a.rows.every(row=>row.points===0));
});
test('team standings retain recorded scores; league points reconcile and every team plays each round',()=>{
 const state=createInitialState(71);state.date='2026-08-05';state.runtime.day=35;
 const actual=recordOfficialMatchInPlace(state,{appeared:true,debutOccurred:true,injuryUnavailable:false});
 const sports=projectCareerSports(state),you=sports.rows.find(row=>row.you);
 const gf=actual.homeAway==='home'?actual.result.homeGoals:actual.result.awayGoals,ga=actual.homeAway==='home'?actual.result.awayGoals:actual.result.homeGoals;
 assert.equal(you.gf,gf);assert.equal(you.ga,ga);assert.equal(you.points,gf>ga?3:gf===ga?1:0);
 assert.ok(sports.position>0);assert.deepEqual(sports.recent,[actual]);
 assert.ok(sports.rows.every(row=>row.played===1));
 for(const row of sports.rows){assert.equal(row.played,row.won+row.drawn+row.lost);assert.equal(row.points,row.won*3+row.drawn);}
 assert.equal(sports.rows.reduce((n,r)=>n+r.gf,0),sports.rows.reduce((n,r)=>n+r.ga,0));
 assert.ok(sports.upcoming.every(m=>m.date>state.date));
});

test('legacy careers show only the last result on home without losing detailed history',()=>{
 const state=createInitialState(71),matches=[];
 for(const [date,day]of [['2026-08-05',35],['2026-08-12',42]]){state.date=date;state.runtime.day=day;matches.push(recordOfficialMatchInPlace(state,{appeared:true,debutOccurred:matches.length===0,injuryUnavailable:false}));}
 const before=structuredClone(state),sports=projectCareerSports(state);
 assert.deepEqual(sports.recent,[matches.at(-1)]);assert.deepEqual(sports.allRecent,matches);
 assert.equal(sports.upcoming.length,1);assert.deepEqual(state,before);
});
