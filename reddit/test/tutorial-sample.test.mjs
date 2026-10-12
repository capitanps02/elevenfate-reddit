import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tutorialSample as sample} from '../client/tutorial-sample.mjs';
import {mountCover} from '../client/cover.mjs';
import {makeRoot} from './cover-dom.mjs';
const source=fs.readFileSync(sample.sourcePath,'utf8');
const from=source.indexOf('id: "'+sample.eventId+'"');
const to=source.indexOf('\n  E({',from);
const block=source.slice(from,to===-1?undefined:to);
const action=(root,id)=>root.querySelector('[data-cover-action="'+id+'"]');
const text=n=>n.textContent+n.children.map(text).join('');
test('tutorial title and body remain an exact copy of the referenced canonical scene',()=>{
 assert.ok(from>=0);assert.ok(block.includes('title: '+JSON.stringify(sample.title)));assert.ok(block.includes('body: '+JSON.stringify(sample.body)));
 assert.equal(sample.choices.length,3);
});
test('each displayed choice and illustrative result belong to the same canonical choice ID',()=>{
 for(const choice of sample.choices){
  const start=block.indexOf('id: "'+choice.id+'"');assert.ok(start>=0);
  const next=block.indexOf('{ id:',start+5);const part=block.slice(start,next===-1?undefined:next);
  assert.ok(part.includes('label: '+JSON.stringify(choice.label)));
  assert.ok(part.includes('primaryMessage: '+JSON.stringify(choice.exampleResult)));
 }
});
for(const [i,choice] of sample.choices.entries())test('tutorial renders '+choice.id+' result without entering game',async()=>{
 const root=makeRoot();let opened=0;
 const dispose=mountCover({root,readCareer:async()=>null,onContinue:()=>opened++,onNew:()=>opened++,onDaily:()=>opened++});
 await Promise.resolve();action(root,'tutorial').click();action(root,'simulate').click();
 assert.ok(text(root).includes(sample.body));const option=action(root,String.fromCharCode(97+i));assert.equal(option.dataset.choiceId,choice.id);option.click();
 assert.ok(text(root).includes(choice.exampleResult));assert.ok(text(root).includes('EJEMPLO DE RESULTADO'));assert.ok(text(root).includes('el contexto puede cambiar el resultado'));assert.equal(opened,0);
 action(root,'acknowledge').click();assert.ok(text(root).includes('entrenamiento, salud'));assert.equal(opened,0);dispose();
});
test('Escape exits tutorial without starting a mode and disposal removes listener',()=>{
 const root=makeRoot();let opened=0,prevented=0;
 const dispose=mountCover({root,authenticated:false,readCareer:async()=>null,onContinue:()=>opened++,onNew:()=>opened++,onDaily:()=>opened++});
 action(root,'tutorial').click();root.listeners.keydown({key:'Escape',preventDefault(){prevented++;}});
 assert.ok(action(root,'tutorial'));assert.equal(prevented,1);assert.equal(opened,0);dispose();assert.equal(root.listeners.keydown,undefined);
});

test('skip enters the appropriate mode only after availability is confirmed',async()=>{
 for(const saved of [false,true]){
  const root=makeRoot();let starts=0,resumes=0;
  const dispose=mountCover({root,readCareer:async()=>saved?'saved':null,onContinue:()=>resumes++,onNew:()=>starts++,onDaily(){}});
  await Promise.resolve();await Promise.resolve();action(root,'tutorial').click();action(root,'skip').click();
  assert.deepEqual([starts,resumes],saved?[0,1]:[1,0]);dispose();
 }
});
