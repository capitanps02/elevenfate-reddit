import test from 'node:test';
import assert from 'node:assert/strict';
import {validDiagnostic,recordDiagnostic,ERROR_CODE} from '../telemetry/diagnostic-contract.mjs';
import {createTelemetryCore} from '../telemetry/core.mjs';
test('every diagnostic family has permitted primitive slots',()=>{
  for(const tuple of [[1,1,0,7],[2,1,1,2.5],[3,1,ERROR_CODE.NETWORK,10],[4,1,1,20],[5,1,2,0],[6,1,1,20],[7,1,ERROR_CODE.CONFLICT,20],[8,16,10,0]])assert.equal(validDiagnostic(...tuple),true);
});
test('unknown enums, nonfinite numbers and narrative fields are rejected',()=>{
  for(const tuple of [[0,1,0,0],[1,0,0,0],[1,1,-1,0],[1,1,0,8],[2,1,1,-1],[2,1,1,Infinity],[3,1,9,0],[5,1,4,0],[5,1,1,1],[8,17,1,0],[8,1,0,0],[2,1,'player',0]])assert.equal(validDiagnostic(...tuple),false);
});
test('validation does not inspect objects or their getters',()=>{
  const bad={get revision(){throw Error('getter');}};
  assert.equal(validDiagnostic(2,1,bad,0),false);assert.equal(validDiagnostic(2,bad,1,0),false);
});
test('off does not call capture; observer exceptions do not escape',()=>{
  assert.equal(recordDiagnostic({enabled:false,tryRecord(){throw Error('called');}},1,1,0,0),false);
  let disabled=0;assert.equal(recordDiagnostic({enabled:true,tryRecord(){throw Error('capture');},disable(){disabled++;}},1,1,0,0),false);assert.equal(disabled,1);
});
test('confirmed, uncertain and reconciled remain distinct and correlated',()=>{
  const core=createTelemetryCore({mode:'diagnostic',now:()=>1});
  for(const tuple of [[1,3,0,1],[3,3,1,10],[4,3,1,20]])assert.equal(recordDiagnostic(core,...tuple),true);
  const rows=core.freeze('s').records;assert.deepEqual(rows.map(x=>x.code),[1,3,4]);assert.deepEqual(rows.map(x=>x.a),[3,3,3]);
});
