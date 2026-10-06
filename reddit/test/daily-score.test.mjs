import test from 'node:test';
import assert from 'node:assert/strict';
import {careerDailyScore,dailyScore,legacyDailyScore,scoreSnapshot} from '../server/daily-score.mjs';
import {newDailyRun,applyDailyCommand} from '../server/daily-run.mjs';
import {dailyConfig,createDailyService} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
function fixture(){
 const state={sport:{form:100,roleScore:100},body:{fitness:100,risk:0},professional:{technique:100},personality:{professionalism:100},control:{career:100}};
 const run={scoringVersion:2,scoreStages:Array.from({length:6},()=>scoreSnapshot(state)),competitions:[{player:{matches:Array.from({length:20},()=>({player:{appeared:true},stats:{rating:9}}))}}],seasons:[]};
 return {state,run};
}
test('six components add up to 1000 at their caps and remain bounded',()=>{
 const {state,run}=fixture();run.seasons=Array.from({length:7},(_,i)=>({season:`s${i}`,club:'c',played:20,titles:['Campeón de liga','Champions · formato adaptado'],awards:[]}));
 const score=careerDailyScore(state,run);assert.equal(score.total,1000);assert.equal(score.breakdown.reduce((n,p)=>n+p.weight,0),100);
 for(const rating of [-20,0,4,6,9,100,NaN]){run.competitions[0].player.matches.forEach(m=>m.stats.rating=rating);const s=careerDailyScore(state,run);assert.ok(Number.isInteger(s.total)&&s.total>=0&&s.total<=1000);}
});
test('performance depends on ratings and participation, not raw goal totals',()=>{
 const {state,run}=fixture(),before=careerDailyScore(state,run);run.seasons=[{goals:999999,assists:999999}];assert.deepEqual(careerDailyScore(state,run),before);
 run.competitions[0].player.matches.slice(1).forEach(m=>m.player.appeared=false);assert.ok(careerDailyScore(state,run).total<before.total);
 run.competitions[0].player.matches[0].stats.rating=4;assert.equal(careerDailyScore(state,run).breakdown[0].points,0);
});
test('early career stages matter even when final attributes are equal',()=>{
 const {state,run}=fixture(),before=careerDailyScore(state,run);run.scoreStages[0]={role:0,technique:0,professionalism:0,control:0,fitness:0,risk:100};assert.ok(careerDailyScore(state,run).total<before.total);
 const score=careerDailyScore(state,{...run,scoreStages:[]});assert.equal(score.breakdown[1].points,0);assert.equal(score.breakdown[3].points,0);
});
test('honours require participation, deduplicate and give diminishing capped rewards',()=>{
 const {state,run}=fixture(),points=()=>careerDailyScore(state,run).breakdown[2].points;
 const row={season:'s',club:'c',played:9,titles:['Campeón de liga'],awards:[]};run.seasons=[row];assert.equal(points(),0);row.played=20;const first=points();assert.ok(first>0);
 run.seasons.push({...row});assert.equal(points(),first);run.seasons.push({...row,season:'s2'});assert.ok(points()>first&&points()-first<first);
 for(let i=3;i<30;i++)run.seasons.push({...row,season:`s${i}`});assert.equal(points(),150);
});
test('legacy attempts preserve the existing formula, frozen new scores survive later changes',()=>{
 const {state,run}=fixture();assert.deepEqual(dailyScore(state,{version:3}),legacyDailyScore(state));assert.equal(legacyDailyScore(state).total,1000);
 run.finalScore=careerDailyScore(state,run);const expected=structuredClone(run.finalScore);state.sport.form=0;state.control.career=0;run.scoreStages=[];assert.deepEqual(dailyScore(state,run),expected);
});
test('rollout uses UTC, preserves v3 and separates practice seeds from the daily',()=>{
 const old=dailyConfig(new Date('2026-10-06T23:59:59Z'));assert.equal(old.rulesVersion,3);assert.equal(old.id,'daily-v3:2026-10-06');assert.equal(old.seed,dailyConfig(new Date('2026-10-06T23:59:59Z'),'practice').seed);
 const date=new Date('2026-10-07T00:00:00Z'),daily=dailyConfig(date),practice=dailyConfig(date,'practice');assert.equal(daily.rulesVersion,4);assert.equal(daily.id,practice.id);assert.notEqual(daily.seed,practice.seed);assert.deepEqual(daily,dailyConfig(date));
});
test('new server attempt freezes score, ignores client points and restores identical results',async()=>{
 const now=()=>new Date('2026-10-07T12:00:00Z'),redis=createMemoryRedis(),service=createDailyService({redis,now});
 let s=await service.act('t2_v2',{action:'start',dailyId:dailyConfig(now()).id});
 while(!s.finished){const v=s.view,command={commandId:`v2-${v.revision}`,expectedRevision:v.revision,type:v.screen==='summary'?'acknowledge':'choose'};if(command.type==='choose')command.choiceId=v.screen==='club'?v.clubs[0].id:v.decision.choices[0].id;s=await service.act('t2_v2',{dailyId:s.config.id,action:'command',command,score:999999});}
 assert.equal(s.score.version,2);assert.equal(s.score.breakdown.length,6);assert.equal(s.leaderboard.score,s.score.total);const restored=await service.read('t2_v2');assert.deepEqual(restored.score,s.score);assert.equal(restored.leaderboard.total,1);
 const practice=await service.act('t2_v2',{action:'start',dailyId:s.config.id,mode:'practice'});assert.notEqual(practice.config.seed,s.config.seed);
});
test('closed career records six snapshots and immutable score in serialized save',()=>{
 const run=newDailyRun({seed:42,rulesVersion:4});while(!run.finished){const command={commandId:`r-${run.revision}`,expectedRevision:run.revision,type:run.summaryPending?'acknowledge':'choose'};if(command.type==='choose')command.choiceId=run.pending.kind==='club'?run.pending.clubs[0].id:run.pending.choices[0].id;applyDailyCommand(run,command);}
 assert.equal(run.scoreStages.length,6);assert.deepEqual(dailyScore(run.state,JSON.parse(JSON.stringify(run))),run.finalScore);
});
