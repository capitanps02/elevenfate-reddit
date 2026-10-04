import test from 'node:test';
import assert from 'node:assert/strict';
import {readWithRetry} from '../client/read-request.mjs';
test('startup GET recovers from a cold gateway and stops after three failures',async()=>{
 let attempts=0;const waits=[];
 const result=await readWithRetry('/api/init',{fetcher:async()=>{attempts++;if(attempts===1)throw Error('Network');return {status:attempts===2?503:200};},wait:async ms=>waits.push(ms)});
 assert.equal(result.status,200);assert.equal(attempts,3);assert.deepEqual(waits,[350,800]);
 attempts=0;await assert.rejects(readWithRetry('/api/init',{fetcher:async()=>{attempts++;throw Error('Offline');},wait:async()=>{}}),/Offline/);assert.equal(attempts,3);
});
test('startup GET does not retry authentication or missing-asset responses',async()=>{
 for(const status of [401,403,404]){let attempts=0;const result=await readWithRetry('/api/init',{fetcher:async()=>{attempts++;return {status};},wait:async()=>{throw Error('must not wait');}});assert.equal(result.status,status);assert.equal(attempts,1);}
});
