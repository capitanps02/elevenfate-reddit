import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGame} from '../../web/game-ui.js';
import {makeGameRoot,all,text,findButton,findInput} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const view={screen:'home',season:'2026-27',date:'2026-07-01',player:{displayName:'Tu jugador'},position:'striker',age:18,club:'CITY',form:70,fitness:70,fatigue:0,decisionsMade:0,simulation:{mode:'idle'}};
function setup({old=null,failCreate=false,createGate=null,readGate=null,onMenu=()=>{}}={}){
 globalThis.localStorage={getItem:()=>null,setItem(){}};
 const root=makeGameRoot();let creates=0,writes=0;
 const session={getView:()=>view};
 const store={read:async()=>readGate?await readGate:old,readRaw:async()=>old,legacyChanged:async()=>false,write:async()=>{writes++;},close:async()=>{},hasPrevious:()=>false};
 const GameSession={migrateFromSave:async()=>session,create:async(seed,opts)=>{creates++;if(createGate)await createGate;if(failCreate)throw Error('network failed');await opts.commit({sessionId:'new',revision:0});return session;}};
 const dispose=mountGame({root,GameSession,saveStore:store,assets:{},css:'',compactHome:true,initialView:'new',autoCreateOnLoad:false,deferAutoResume:true,onMenu});
 return {root,dispose,stats:()=>({creates,writes})};
}
function name(root,value){const n=findInput(root,'Nombre y apellido de la nueva carrera');assert.ok(n);n.value=value;n.listeners.input();}
test('new entry renders only creation and does not auto-create; first career needs no overwrite dialog',async()=>{
 const x=setup();await tick();assert.deepEqual(x.stats(),{creates:0,writes:0});
 assert.ok(all(x.root).some(n=>n.tagName==='H1'&&text(n)==='Nueva partida'));
 name(x.root,'Álex');findButton(x.root,'Empezar mi carrera').click();await tick();
 assert.deepEqual(x.stats(),{creates:1,writes:1});assert.equal(x.root.querySelector('dialog[open]'),null);x.dispose();
});
test('failed creation preserves entered identity for retry',async()=>{
 const x=setup({failCreate:true});await tick();name(x.root,'Noa D’Avila');
 findButton(x.root,'Empezar mi carrera').click();await tick();
 assert.equal(findInput(x.root,'Nombre y apellido de la nueva carrera').value,'Noa D’Avila');assert.deepEqual(x.stats(),{creates:1,writes:0});x.dispose();
});
test('existing career requires replacement confirmation and cancellation writes nothing',async()=>{
 const x=setup({old:'existing'});await tick();name(x.root,'Nueva identidad');
 findButton(x.root,'Empezar mi carrera').click();await tick();
 const dialog=x.root.querySelector('dialog[open]');assert.ok(dialog);assert.deepEqual(x.stats(),{creates:0,writes:0});
 findButton(dialog,'Cancelar').click();assert.equal(x.root.querySelector('dialog[open]'),null);assert.deepEqual(x.stats(),{creates:0,writes:0});x.dispose();
});
test('empty code is rejected and the draft is retained',async()=>{
 const x=setup();await tick();name(x.root,'Álex');const code=findInput(x.root,'Código de historia de la nueva carrera');code.value='';code.listeners.input();
 findButton(x.root,'Empezar mi carrera').click();await tick();assert.deepEqual(x.stats(),{creates:0,writes:0});assert.equal(findInput(x.root,'Nombre y apellido de la nueva carrera').value,'Álex');x.dispose();
});

test('Escape cannot leave an entry while creating a career; it returns to menu when idle',async()=>{
 let release,menus=0;const gate=new Promise(resolve=>{release=resolve;});
 const x=setup({createGate:gate,onMenu:()=>menus++});await tick();name(x.root,'Álex');findButton(x.root,'Empezar mi carrera').click();await tick();
 assert.equal(x.dispose.canLeave(),false);x.root.listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(menus,0);
 release();await tick();assert.equal(x.dispose.canLeave(),true);x.root.listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(menus,1);x.dispose();
});

test('a slow read can be left without creating a career after disposal',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const x=setup({readGate:gate});
 assert.equal(x.dispose.canLeave(),true);x.dispose();release(null);await tick();assert.deepEqual(x.stats(),{creates:0,writes:0});assert.equal(x.root.children.length,0);
});
