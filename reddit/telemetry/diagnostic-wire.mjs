// Isolated receiver contract. No HTTP, storage or production imports.
import {validDiagnostic} from './diagnostic-contract.mjs';
export const MAX_WIRE_BYTES=16_384;
const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(x);
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const fail=reason=>Object.freeze({ok:false,reason});

// text is untrusted JSON; lease is supplied by the authenticated server adapter.
// Bytes must also be bounded by the HTTP parser before a string is allocated.
export function decodeDiagnosticBatch(text,lease) {
  if(typeof text!=='string'||text.length>MAX_WIRE_BYTES)return fail('size');
  if(new TextEncoder().encode(text).byteLength>MAX_WIRE_BYTES)return fail('size');
  let v;try{v=JSON.parse(text);}catch{return fail('json');}
  if(!exact(v,['schema','catalog','session','generation','batchId','records'])||v.schema!==1||v.catalog!==1)return fail('schema');
  if(!token(v.session)||!token(v.batchId)||!integer(v.generation))return fail('schema');
  if(!lease||lease.allowed!==true||!token(lease.session)||!integer(lease.generation)||!integer(lease.now)||!integer(lease.expiresAt)||lease.now>=lease.expiresAt||v.session!==lease.session||v.generation!==lease.generation)return fail('permission');
  if(!Array.isArray(v.records)||v.records.length<1||v.records.length>32)return fail('records');
  let seq=0,at=-1;
  const records=[];
  for(const r of v.records) {
    if(!exact(r,['code','seq','at','a','b','c'])||!integer(r.seq,1)||r.seq<=seq||typeof r.at!=='number'||!Number.isFinite(r.at)||r.at<at||r.at<0||r.at>Number.MAX_SAFE_INTEGER||!validDiagnostic(r.code,r.a,r.b,r.c))return fail('records');
    seq=r.seq;at=r.at;
    records.push(Object.freeze({code:r.code,seq:r.seq,at:r.at,a:r.a,b:r.b,c:r.c}));
  }
  const batch=Object.freeze({schema:1,catalog:1,session:v.session,generation:v.generation,batchId:v.batchId,records:Object.freeze(records)});
  // Canonical ordering: whitespace / object key order do not change retry identity.
  const wire=JSON.stringify(batch);
  if(new TextEncoder().encode(wire).byteLength>MAX_WIRE_BYTES)return fail('size');
  return Object.freeze({ok:true,batch,wire});
}

// Pure stop-and-wait decision; caller must persist state AND data atomically.
// State is scoped to one authenticated session/generation, retained until lease expiry.
// Old sessions may never recreate admission state after it expires.
export function decideDiagnosticAdmission(previous,decoded) {
  if(!decoded?.ok)return Object.freeze({status:'rejected',reason:decoded?.reason??'schema'});
  const {batch,wire}=decoded;
  if(previous) {
    if(previous.session!==batch.session||previous.generation!==batch.generation)return Object.freeze({status:'rejected',reason:'scope'});
    if(previous.batchId===batch.batchId)return Object.freeze({status:previous.wire===wire?'duplicate':'rejected',reason:previous.wire===wire?null:'conflict',state:previous});
    if(batch.records[0].seq<=previous.lastSeq)return Object.freeze({status:'rejected',reason:'stale'});
    if(batch.records[0].at<previous.lastAt)return Object.freeze({status:'rejected',reason:'clock'});
  }
  const last=batch.records.at(-1);
  const state=Object.freeze({session:batch.session,generation:batch.generation,batchId:batch.batchId,lastSeq:last.seq,lastAt:last.at,wire});
  return Object.freeze({status:'accepted',state});
}
