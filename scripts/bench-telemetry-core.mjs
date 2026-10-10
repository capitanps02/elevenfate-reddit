// Laboratory smoke benchmark; not a browser/device performance certificate.
import {performance} from 'node:perf_hooks';
import {gzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {createTelemetryCore} from '../reddit/telemetry/core.mjs';
const samples=[];
const percentile=(xs,p)=>xs[Math.ceil(xs.length*p)-1];
for(let session=0;session<30;session++) {
  const core=createTelemetryCore({mode:'diagnostic',now:()=>performance.now()});
  for(let chunk=0;chunk<120;chunk++) {
    const start=performance.now();
    for(let i=0;i<128;i++)if(!core.tryRecord(1,chunk,i))throw Error('unexpected loss');
    const cost=(performance.now()-start)/128;
    if(chunk>=20)samples.push(cost);
    while(core.health().queued) {const batch=core.freeze('lab');if(!core.ack(batch.batchId))throw Error('ack failed');}
  }
}
samples.sort((a,b)=>a-b);
const core=createTelemetryCore({mode:'diagnostic'});
console.log(JSON.stringify({node:process.version,sessions:30,measuredChunks:samples.length,eventsPerChunk:128,
  chunkAmortizedCaptureMs:{p50:percentile(samples,.5),p95:percentile(samples,.95),p99:percentile(samples,.99)},
  typedBackingBytes:core.health().typedBytes,sourceGzipBytes:gzipSync(readFileSync(new URL('../reddit/telemetry/core.mjs',import.meta.url))).byteLength,
  limits:'Node laboratory only. Chunk percentiles are not per-call percentiles. Excludes serialization, transport, game rendering and physical-device energy. Source gzip is not a bundle measurement.'},null,2));
