import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {gzipSync} from 'node:zlib';
import {createDiagnosticRouter} from '../telemetry/diagnostic-http.mjs';
async function fixture(t,overrides={}) {
  const calls=[];
  const app=express();
  app.use('/api/telemetry',createDiagnosticRouter({enabled:true,express,context:()=>({userId:'t2_abc'}),
    admitAttempt:async user=>{calls.push(['gate',user]);return {allowed:true};},
    subjectFor:async user=>{calls.push(['subject',user]);return 'opaque_subject';},
    store:{receive:async(subject,wire)=>{calls.push(['store',subject,wire]);return {status:200,result:'accepted',batchId:'b1'};}},...overrides}));
  // Mirrors production order: narrow parser must precede the global parser.
  app.use(express.json({limit:'2mb'}));
  app.post('/api/career',(req,res)=>res.json({length:req.body.text.length}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  return {calls,post:(body='{}',headers={})=>fetch(base+'/api/telemetry/diagnostic',{method:'POST',headers:{'Content-Type':'application/json',...headers},body}),base};
}
test('HTTP disabled never reads enabled dependencies',()=>{
  const middleware=createDiagnosticRouter({get express(){throw Error('access');}});
  const res={status(n){assert.equal(n,403);return this;},set(){return this;},json(x){assert.equal(x.result,'disabled');}};middleware({},res);
});
test('HTTP authenticates server context and emits only bounded receipt',async t=>{
  const f=await fixture(t);const r=await f.post('{"subject":"attacker"}');
  assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
  assert.deepEqual(await r.json(),{result:'accepted',batchId:'b1'});assert.equal(f.calls[2][1],'opaque_subject');
});
test('HTTP unauthenticated oversized body never reaches gate or store',async t=>{
  const f=await fixture(t,{context:()=>({userId:null})});assert.equal((await f.post('x'.repeat(20000))).status,401);assert.deepEqual(f.calls,[]);
});
test('HTTP attempt quota precedes identity and parsing',async t=>{
  const f=await fixture(t,{admitAttempt:async()=>({allowed:false,retryAfterSeconds:60})});
  const r=await f.post('x'.repeat(20000));assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');assert.deepEqual(f.calls,[]);
});
test('HTTP gate failure closes admission without storage',async t=>{
  const f=await fixture(t,{admitAttempt:async()=>{throw Error('secret');}});assert.equal((await f.post()).status,503);assert.deepEqual(f.calls,[]);
});
test('HTTP invalid trusted subject never reaches store',async t=>{
  const f=await fixture(t,{subjectFor:async()=> 't2/unsafe'});assert.equal((await f.post()).status,503);assert.equal(f.calls.length,1);
});
test('HTTP exactly 16 KiB succeeds and next byte fails',async t=>{
  const f=await fixture(t);assert.equal((await f.post('x'.repeat(16384))).status,200);assert.equal((await f.post('x'.repeat(16385))).status,413);assert.equal(f.calls.filter(x=>x[0]==='store').length,1);
});
test('HTTP counts UTF8 bytes rather than characters',async t=>{
  const f=await fixture(t);assert.equal((await f.post('é'.repeat(8193))).status,413);assert.equal(f.calls.filter(x=>x[0]==='store').length,0);
});
test('HTTP rejects invalid UTF8 before store',async t=>{
  const f=await fixture(t);assert.equal((await f.post(Buffer.from([0xc3,0x28]))).status,400);assert.equal(f.calls.filter(x=>x[0]==='store').length,0);
});
test('HTTP rejects compressed and wrong media bodies',async t=>{
  const f=await fixture(t);assert.equal((await f.post(gzipSync('{}'),{'Content-Encoding':'gzip'})).status,415);assert.equal((await f.post('{}',{'Content-Type':'text/plain'})).status,415);assert.equal(f.calls.filter(x=>x[0]==='store').length,0);
});
test('HTTP storage uncertainty emits no successful receipt',async t=>{
  const f=await fixture(t,{store:{receive:async()=>{throw Error('sensitive');}}});const r=await f.post();assert.equal(r.status,503);assert.deepEqual(await r.json(),{result:'retry'});
});
test('HTTP narrow parser leaves career body limit intact',async t=>{
  const f=await fixture(t);const r=await fetch(f.base+'/api/career',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'x'.repeat(20000)})});assert.equal(r.status,200);assert.deepEqual(await r.json(),{length:20000});assert.deepEqual(f.calls,[]);
});
