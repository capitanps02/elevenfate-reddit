import test from 'node:test';
import assert from 'node:assert/strict';
import {TxClientImplementation} from '@devvit/redis';
import {runWithContext} from '@devvit/server';
import webPackage from '@devvit/web/package.json' with {type:'json'};
import redisPackage from '@devvit/redis/package.json' with {type:'json'};
import {createDiagnosticStore} from '../telemetry/diagnostic-store.mjs';
test('exact SDK 0.14.6 get queues and returns the transaction',async()=>{
  assert.equal(webPackage.version,'0.14.6');assert.equal(redisPackage.version,'0.14.6');
  const metadata={},calls=[];
  await runWithContext({metadata},async()=>{
    const tx=new TxClientImplementation({Get:async(req,meta)=>{calls.push(req);assert.equal(meta,metadata);return {value:'not-a-read'};}},{id:'tx'},metadata);
    assert.equal(await tx.get('key'),tx);assert.equal(calls[0].key,'key');assert.deepEqual(calls[0].transactionId,{id:'tx'});
  });
});
test('exact SDK EXEC decodes success nil and empty responses',async()=>{
  const metadata={};await runWithContext({metadata},async()=>{
    for(const [response,expected] of [[[{str:'OK'}],['OK']],[[{nil:true}],[null]],[[],[]]]){
      const tx=new TxClientImplementation({Exec:async()=>({response})},{id:'tx'},metadata);assert.deepEqual(await tx.exec(),expected);
    }
  });
});
test('exact SDK refuses a transaction carried into another request',async()=>{
  const metadata={},tx=new TxClientImplementation({Exec:async()=>{throw Error('must not call');}},{id:'tx'},metadata);
  await runWithContext({metadata:{}},async()=>assert.rejects(tx.exec(),/metadata does not match/));
});
test('store works through exact TxClient with injected RPC and uncertain EXEC',async()=>{
  const metadata={};let raw,response=[{str:'OK'}],writes=0;
  await runWithContext({metadata},async()=>{
    const plugin={Multi:async()=>{},Set:async req=>{raw=req.value;writes++;},Exec:async()=>({response}),Discard:async()=>{}};
    const redis={get:async()=>raw,watch:async()=>new TxClientImplementation(plugin,{id:'tx'},metadata)};
    const store=createDiagnosticStore({enabled:true,redis,now:()=>1000});
    assert.equal((await store.configure('subject',{expectedGeneration:0,allowed:true,session:'session',expiresAt:10000})).status,200);
    response=[];
    const wire=JSON.stringify({schema:1,catalog:1,session:'session',generation:1,batchId:'b1',records:[{code:1,seq:1,at:1,a:1,b:0,c:0}]});
    assert.equal((await store.receive('subject',wire)).status,503);assert.equal(writes,2);
    // RPC double committed despite lost acknowledgement; retry counts once.
    response=[{str:'OK'}];assert.equal((await store.receive('subject',wire)).result,'duplicate');assert.equal(JSON.parse(raw).samples,1);
  });
});
