import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {serializeDailyRun,hydrateDailyArchive} from '../server/daily-archive.mjs';
import {newDailyRun,applyDailyCommand,dailyRunView,dailyScore} from '../server/daily-run.mjs';
import {createDailyService,dailyConfig} from '../server/daily-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
const command=run=>({commandId:`archive-${run.revision}`,expectedRevision:run.revision,type:run.summaryPending?'acknowledge':'choose',choiceId:run.pending?.kind==='club'?run.pending.clubs[run.revision%3].id:run.pending?.choices[run.revision%3].id});
const decode=run=>hydrateDailyArchive(JSON.parse(serializeDailyRun(run)));
function completed(){const run=newDailyRun({seed:907,rulesVersion:5});while(!run.finished)applyDailyCommand(run,command(run));return run;}

test('archived reload at every decision preserves simulation, receipts, scores and every historical season',()=>{
 let recovered=newDailyRun({seed:907,rulesVersion:5}),original=structuredClone(recovered);
 while(!original.finished){
  const action=command(original);applyDailyCommand(original,action);applyDailyCommand(recovered,action);
  const untouched=JSON.stringify(recovered);recovered=decode(recovered);assert.deepEqual(JSON.parse(untouched),original);assert.deepEqual(recovered,original);
  assert.deepEqual(dailyScore(recovered.state,recovered),dailyScore(original.state,original));
  for(const season of original.competitions)assert.deepEqual(dailyRunView(recovered,season.id),dailyRunView(original,season.id));
  const once=structuredClone(recovered);applyDailyCommand(recovered,action);assert.deepEqual(recovered,once);
 }
 assert.equal(original.competitions.length,20);assert.ok(Buffer.byteLength(serializeDailyRun(original))<Buffer.byteLength(JSON.stringify(original))*.65);
});

test('archive preserves false, zero, null, optional fields and new historical metadata without mutating the run',()=>{
 const run=completed(),match=run.competitions[0].matches[0];Object.assign(match,{futureFlag:false,futureNumber:0,futureNull:null,metadata:{text:'detalle',empty:null}});
 const before=structuredClone(run),recovered=decode(run);assert.deepEqual(run,before);assert.deepEqual(recovered,before);
 assert.deepEqual(decode(recovered),before);
});

test('legacy v3/v4 and unarchived v5 save shapes remain readable; active seasons remain uncompressed',()=>{
 for(const version of [3,4]){const run=newDailyRun({seed:907,rulesVersion:version});assert.equal(serializeDailyRun(run),JSON.stringify(run));assert.deepEqual(hydrateDailyArchive(JSON.parse(serializeDailyRun(run))),run);}
 const run=newDailyRun({seed:907,rulesVersion:5});for(let i=0;i<3;i++)applyDailyCommand(run,command(run));
 const old=JSON.parse(JSON.stringify(run));assert.deepEqual(hydrateDailyArchive(old),old);
 const saved=JSON.parse(serializeDailyRun(run));for(let i=0;i<run.competitions.length;i++)if(!run.competitions[i].closed)assert.deepEqual(saved.competitions[i],run.competitions[i]);
});

test('service upgrades an existing unarchived v5 attempt and recovers its confirmed compact save',async()=>{
 const redis=createMemoryRedis(),now=new Date('2026-10-06T12:00:00Z'),config=dailyConfig(now),run=newDailyRun(config);while(run.resolved<10)applyDailyCommand(run,command(run));
 const key=`${config.id}:career:v1:t2_archive`;await redis.set(key,JSON.stringify({version:1,generation:1,active:JSON.stringify(run),previous:null}));
 const service=createDailyService({redis,now:()=>now});assert.deepEqual((await service.read('t2_archive')).view,dailyRunView(run));
 const action=command(run);applyDailyCommand(run,action);const result=await service.act('t2_archive',{dailyId:config.id,action:'command',command:action});assert.deepEqual(result.view,dailyRunView(run));
 const envelope=JSON.parse(inflateSync(Buffer.from((await redis.get(key)).slice(3),'base64'))),compact=JSON.parse(envelope.active);assert.equal(compact.archiveFormat,1);assert.ok(!Array.isArray(compact.competitions[0].matches));
 assert.deepEqual((await service.read('t2_archive')).view,result.view);
 const confirmed=await redis.get(key);await service.act('t2_archive',{dailyId:config.id,action:'command',command:action});assert.equal(await redis.get(key),confirmed);
 await assert.rejects(service.act('t2_archive',{dailyId:config.id,action:'command',command:{...action,commandId:'stale',expectedRevision:0}}),error=>error.status===409);assert.equal(await redis.get(key),confirmed);
});

test('invalid archive tables and unknown formats are rejected without replacing the saved record',async()=>{
 const run=completed(),base=JSON.parse(serializeDailyRun(run));
 for(const mutate of [r=>r.archiveFormat=2,r=>r.competitions[0].matches.rows[0][0]=-1,r=>r.competitions[0].matches.rows[0].pop(),r=>r.competitions[0].matches.keys[0]='__proto__',r=>r.competitions[0].player.matches.nested[1].rows.pop(),r=>{r.competitions[0].player.matches.nested['01']=r.competitions[0].player.matches.nested[1];delete r.competitions[0].player.matches.nested[1];},r=>r.competitions[0].player.matches.rows[0][2]='wrong placeholder']){
  const compact=structuredClone(base);mutate(compact);assert.throws(()=>hydrateDailyArchive(compact));
  const redis=createMemoryRedis(),now=new Date('2026-10-06T12:00:00Z'),config=dailyConfig(now),key=`${config.id}:career:v1:t2_invalid`,stored=JSON.stringify({version:1,generation:1,active:JSON.stringify(compact),previous:null});await redis.set(key,stored);
  await assert.rejects(createDailyService({redis,now:()=>now}).read('t2_invalid'),error=>error.status===500&&/conserva/.test(error.message));assert.equal(await redis.get(key),stored);
 }
});
