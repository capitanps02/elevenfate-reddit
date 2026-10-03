import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../../dist/session/game-session.js';
import {createCareerService} from '../server/career-service.mjs';
import {createMemoryRedis} from './memory-redis.mjs';
test('real ElevenFate snapshots survive cloud roundtrip with unchanged RNG and view',async()=>{
  const service=createCareerService({redis:createMemoryRedis(),validate:raw=>GameSession.migrateFromSave(raw)});
  let record=await service.read('t2_player');
  const session=await GameSession.create(424242,{sessionId:'reddit-test-career',commit:async snapshot=>{record=await service.write('t2_player',{raw:JSON.stringify(snapshot),expectedGeneration:record.generation});}});
  for(let i=0;i<12;i++){
    const v=session.getView(),cmd={commandId:'reddit-test-'+i,expectedRevision:v.revision};
    if(v.screen==='decision')Object.assign(cmd,{type:'choose',pendingInstanceId:v.decision.instanceId,choiceId:v.decision.choices[0].id});
    else if(v.screen==='result')cmd.type='acknowledge';
    else if(v.screen==='offer')Object.assign(cmd,{type:'offer',offerId:v.offer.id,action:'accept'});
    else if(v.screen==='epilogue')break;
    else Object.assign(cmd,{type:'continue',maxDays:366});
    await session.dispatch(cmd);
  }
  const restored=await GameSession.migrateFromSave((await service.read('t2_player')).active);
  // JSON persistence omits undefined optional fields, as the original store does.
  assert.deepEqual(restored.exportSnapshot(),JSON.parse(JSON.stringify(session.exportSnapshot())));
  assert.deepEqual(restored.exportSnapshot().state.rngState,session.exportSnapshot().state.rngState);
  assert.deepEqual(restored.getView(),session.getView());
  assert.ok(record.generation>1);assert.ok(record.previous);
});
