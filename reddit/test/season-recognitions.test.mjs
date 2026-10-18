import test from 'node:test';
import assert from 'node:assert/strict';
import {createLeagueSeason} from '../shared/league-simulator.mjs';
import {seasonRecognitions} from '../shared/season-recognitions.mjs';
import {newDailyRun,applyDailyCommand,dailyRunView,dailyScore} from '../server/daily-run.mjs';
import {serializeDailyRun,hydrateDailyArchive} from '../server/daily-archive.mjs';
import {dailyConfig,createDailyService} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
const fixture=(count,minutes,rating,started=true)=>{
  const season=createLeagueSeason({seed:42,year:2026,clubId:'UDV',tier:3,sportsVersion:4});season.closed=true;
  season.player.matches=Array.from({length:count},()=>({player:{appeared:true,started,minutes},stats:{rating}}));
  // Comparable club rivals with a better average prevent the club-top-three badge.
  const team=season.teams.findIndex(t=>t.id===season.clubId);season.squads[team]=season.squads[team].map(()=>[0,30,2000,16000]);
  return season;
};
test('regularity recognition requires closed season, enough minutes, appearances and real rating',()=>{
  const good=fixture(20,75,6.5);assert.equal(seasonRecognitions(good)[0].id,'reliable_season');
  for(const season of [fixture(19,90,6.5),fixture(20,74,6.5),fixture(20,75,6.4)])assert.deepEqual(seasonRecognitions(season),[]);
  good.closed=false;assert.deepEqual(seasonRecognitions(good),[]);
});
test('streak requires five consecutive substantial appearances, not five good games scattered through the season',()=>{
  assert.equal(seasonRecognitions(fixture(5,30,7))[0].id,'good_run');
  assert.deepEqual(seasonRecognitions(fixture(5,1,7)),[]);
  const broken=fixture(9,30,7);broken.player.matches[4].stats.rating=6.9;assert.deepEqual(seasonRecognitions(broken),[]);
});
test('bench recognition requires meaningful exposure and at least two standout substitute appearances',()=>{
  const season=fixture(10,25,6.4,false);season.player.matches[0].stats.rating=7;season.player.matches[1].stats.rating=7;
  assert.equal(seasonRecognitions(season)[0].id,'useful_substitute');
  const noImpact=fixture(10,25,6.5,false);assert.deepEqual(seasonRecognitions(noImpact),[]);
  const tooBrief=structuredClone(season);tooBrief.player.matches[0].player.minutes=24;assert.deepEqual(seasonRecognitions(tooBrief),[]);
});
test('club distinction compares eligible rivals and gives only the strongest minor badge',()=>{
  const season=fixture(20,90,7),own=season.teams.findIndex(t=>t.id===season.clubId);
  season.squads[own]=season.squads[own].map(()=>[0,30,2000,13000]);
  const before=structuredClone(season),items=seasonRecognitions(season);assert.equal(items.length,1);assert.equal(items[0].id,'club_standout');assert.match(items[0].reason,/1800/);assert.deepEqual(season,before);
  assert.deepEqual(seasonRecognitions(season,['Jugador de la temporada']),[]);
});
test('recognition metadata changes no match, state, major award or score and persists through compact reload',()=>{
  let enabled=newDailyRun({seed:907,rulesVersion:7}),old=structuredClone(enabled);delete old.recognitionVersion;
  while(!enabled.finished){const command={commandId:`recognition-${enabled.revision}`,expectedRevision:enabled.revision,type:enabled.summaryPending?'acknowledge':'choose',choiceId:enabled.pending?.kind==='club'?enabled.pending.clubs[enabled.revision%3].id:enabled.pending?.choices[enabled.revision%3].id};applyDailyCommand(enabled,command);applyDailyCommand(old,command);assert.deepEqual(enabled.state,old.state);assert.deepEqual(enabled.competitions,old.competitions);assert.deepEqual(enabled.cups,old.cups);const raw=serializeDailyRun(enabled);assert.deepEqual(hydrateDailyArchive(JSON.parse(raw)),enabled);const before=structuredClone(enabled);applyDailyCommand(enabled,command);assert.deepEqual(enabled,before);}
  const view=dailyRunView(enabled),oldView=dailyRunView(old);assert.deepEqual(view.awards,oldView.awards);assert.deepEqual(dailyScore(enabled.state,enabled),dailyScore(old.state,old));assert.equal(oldView.recognitions,undefined);assert.ok(view.recognitions.every(r=>r.reason&&r.season&&r.club));assert.equal(new Set(view.recognitions.map(r=>r.season)).size,view.recognitions.length);
});

test('service preserves previous v7 attempts without recognition policy and rejects unknown policies without overwriting',async()=>{
  const redis=createMemoryRedis(),now=new Date('2026-10-08T12:00:00Z'),config=dailyConfig(now),service=createDailyService({redis,now:()=>now});
  for(const policy of [undefined,2]){
    const userId=policy===undefined?'t2_oldrecognition':'t2_badrecognition',run=newDailyRun(config);
    if(policy===undefined)delete run.recognitionVersion;else run.recognitionVersion=policy;
    const key=`${config.id}:career:v1:${userId}`,raw=JSON.stringify({version:1,generation:1,active:serializeDailyRun(run),previous:null});await redis.set(key,raw);
    if(policy===undefined){const result=await service.act(userId,{dailyId:config.id,action:'start'});assert.equal(result.view.recognitions,undefined);assert.deepEqual(result.view,dailyRunView(run));}
    else await assert.rejects(service.read(userId),/El intento se conserva/);
    assert.equal(await redis.get(key),raw);
  }
});
