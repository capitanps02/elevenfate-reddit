import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GameSession} from '../dist/session/game-session.js';

// Exercise the original interactive career, measuring the actual wire encoding.
const bytes=value=>Buffer.byteLength(value,'utf8');
let previous=null,generation=0,maxSnapshotBytes=0,maxRequestBytes=0,maxRecordBytes=0;
const session=await GameSession.create(424242,{commit:async snapshot=>{
  const raw=JSON.stringify(snapshot);
  maxSnapshotBytes=Math.max(maxSnapshotBytes,bytes(raw));
  maxRequestBytes=Math.max(maxRequestBytes,bytes(JSON.stringify({raw,expectedGeneration:generation})));
  maxRecordBytes=Math.max(maxRecordBytes,bytes(JSON.stringify({version:1,generation:++generation,active:raw,previous})));
  previous=raw;
}});
let commands=0;
while(commands<3000){
  const view=session.getView();
  if(view.screen==='epilogue')break;
  const command={commandId:`size-audit-${commands++}`,expectedRevision:view.revision};
  if(view.screen==='decision')Object.assign(command,{type:'choose',pendingInstanceId:view.decision.instanceId,choiceId:view.decision.choices[0].id});
  else if(view.screen==='offer')Object.assign(command,{type:'offer',offerId:view.offer.id,action:'accept'});
  else command.type=view.screen==='result'?'acknowledge':'continue';
  await session.dispatch(command);
  if(commands%100===0)console.log(`Career size audit: ${commands} commands, age ${session.exportSnapshot().state.age}`);
}
assert.equal(session.getView().screen,'epilogue','Audit must reach a completed career');
assert.ok(maxSnapshotBytes<=1_500_000,'Snapshot exceeds the service limit');
assert.ok(maxRequestBytes<2*1024*1024,'Encoded PUT exceeds Express limit');
assert.ok(maxRecordBytes<5*1024*1024,'Active + previous exceeds Redis request limit');
const report={seed:424242,choiceStrategy:'first',commands,commits:generation,screen:session.getView().screen,maxSnapshotBytes,maxRequestBytes,maxRecordBytes,limits:{snapshotBytes:1_500_000,httpBytes:2*1024*1024,redisRequestBytes:5*1024*1024},scope:'One complete deterministic career; not proof for every seed or real Redis performance.'};
await fs.writeFile('docs/reddit/save-size-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
