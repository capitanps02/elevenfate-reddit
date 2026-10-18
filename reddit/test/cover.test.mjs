import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocale} from '../i18n/runtime.mjs';
import {mountCover} from '../client/cover.mjs';
import {makeRoot} from './cover-dom.mjs';
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
const action=(root,key)=>root.querySelector('[data-cover-action="'+key+'"]');
test('tutorial interaction never enters a career or consumes Daily; final CTA is explicit',async()=>{
 const root=makeRoot();let reads=0,starts=0,daily=0,continues=0;
 const dispose=mountCover({root,locale:createLocale(),readCareer:async()=>{reads++;return null;},onNew:()=>starts++,onContinue:()=>continues++,onDaily:()=>daily++});
 await settle();
 assert.equal(action(root,'continue').disabled,true);assert.equal(action(root,'en').disabled,false);
 action(root,'tutorial').click();action(root,'simulate').click();action(root,'b').click();action(root,'acknowledge').click();
 assert.equal(starts+daily+continues,0);assert.equal(reads,1);
 action(root,'play').click();assert.equal(starts,1);assert.equal(daily+continues,0);
 dispose();assert.equal(root.children.length,0);
});
test('saved career selects Continue and keeps explicit New and Daily actions',async()=>{
 const root=makeRoot();let resumed=0,newCareer=0,daily=0;
 mountCover({root,locale:createLocale(),readCareer:async()=>'save',onContinue:()=>resumed++,onNew:()=>newCareer++,onDaily:()=>daily++});
 await settle();
 action(root,'continue').click();action(root,'new').click();action(root,'daily').click();
 assert.deepEqual([resumed,newCareer,daily],[1,1,1]);
});
test('anonymous visitors can inspect tutorial but cannot start authenticated modes',()=>{
 const root=makeRoot();let reads=0;
 mountCover({root,locale:createLocale(),authenticated:false,readCareer:async()=>{reads++;return null;},onContinue(){throw Error('unexpected');},onNew(){throw Error('unexpected');},onDaily(){throw Error('unexpected');}});
 for(const key of ['continue','new','daily'])assert.equal(action(root,key).disabled,true);
 action(root,'tutorial').click();action(root,'skip').click();assert.equal(reads,0);
 assert.ok(action(root,'tutorial'));
});
test('late availability response does not reset an in-progress tutorial',async()=>{
 let resolve;const root=makeRoot();
 mountCover({root,locale:createLocale(),readCareer:()=>new Promise(done=>{resolve=done;}),onContinue(){},onNew(){},onDaily(){}});
 action(root,'tutorial').click();action(root,'simulate').click();resolve('save');await settle();
 assert.ok(action(root,'a'));assert.ok(action(root,'b'));assert.equal(action(root,'continue'),null);
});
