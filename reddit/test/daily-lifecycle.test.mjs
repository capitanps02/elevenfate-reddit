import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDaily} from '../client/daily.mjs';
import {makeGameRoot,findButton} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Daily allows exit during read and ignores a late response after disposal',async()=>{
 const root=makeGameRoot();let complete,closed=0;
 const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
 globalThis.document=root.ownerDocument;globalThis.fetch=()=>new Promise(resolve=>{complete=resolve;});
 try{
  const dispose=mountDaily({root,onClose:()=>closed++});assert.equal(dispose.canLeave(),true);assert.equal(findButton(root,'←').disabled,false);
  findButton(root,'←').click();assert.equal(closed,1);dispose();complete({ok:true,json:async()=>({})});await tick();assert.equal(root.children.length,0);
 }finally{globalThis.document=originalDocument;globalThis.fetch=originalFetch;}
});
test('Daily blocks exit during a write until the response is resolved',async()=>{
 const root=makeGameRoot();let complete,closed=0;
 const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
 globalThis.document=root.ownerDocument;globalThis.fetch=async(_url,options)=>options.method==='GET'?{ok:true,json:async()=>({started:false,config:{id:'day'}})}:await new Promise(resolve=>{complete=resolve;});
 try{
  const dispose=mountDaily({root,onClose:()=>closed++});await tick();findButton(root,'Jugar el Daily').click();await tick();
  assert.equal(dispose.canLeave(),false);assert.equal(findButton(root,'←').disabled,true);findButton(root,'←').click();assert.equal(closed,0);
  complete({ok:true,json:async()=>({started:false,config:{id:'day'}})});await tick();assert.equal(dispose.canLeave(),true);dispose();
 }finally{globalThis.document=originalDocument;globalThis.fetch=originalFetch;}
});
