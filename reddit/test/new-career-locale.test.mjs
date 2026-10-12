import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGame} from '../../web/game-ui.js';
import {createPresentationLocale} from '../client/presentation-locale.mjs';
import {makeGameRoot,all,text,findButton,findInput} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const playerView={screen:'home',season:'2026-27',date:'2026-07-01',player:{displayName:'Tu jugador'},position:'striker',age:18,club:'CITY',form:70,fitness:70,fatigue:0,decisionsMade:0,simulation:{mode:'idle'}};
function setup({initialLocale='en',old=null,createGate=null,failCreate=false,readGate=null}={}){
 const oldStorage=globalThis.localStorage;globalThis.localStorage={getItem:()=>null,setItem(){}};
 const root=makeGameRoot(),i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale}),calls={reads:0,creates:[],writes:[],menus:0};
 const session={getView:()=>playerView};
 const store={read:async()=>{calls.reads++;return readGate?await readGate:old;},readRaw:async()=>{calls.reads++;return old;},legacyChanged:async()=>false,write:async(next,previous)=>calls.writes.push({next,previous}),close:async()=>{},hasPrevious:()=>false};
 const GameSession={migrateFromSave:async()=>session,create:async(seed,options)=>{calls.creates.push({seed,name:options.playerDisplayName});if(createGate)await createGate;if(failCreate)throw Error('Error interno sin traducir');await options.commit({sessionId:'new',revision:0});return session;}};
 const dispose=mountGame({root,GameSession,saveStore:store,assets:{},css:'',compactHome:true,initialView:'new',autoCreateOnLoad:false,deferAutoResume:true,onMenu:()=>calls.menus++,presentationLocale:i18n});
 return {root,i18n,calls,dispose,close(){dispose();globalThis.localStorage=oldStorage;}};
}
function enter(root,name='Álex D’Avila',seed='207'){
 const inputs=all(root).filter(n=>n.tagName==='INPUT');
 const nameInput=inputs.find(n=>n.dataset.entryField==='name'),seedInput=inputs.find(n=>n.dataset.entryField==='code');nameInput.value=name;nameInput.listeners.input();seedInput.value=seed;seedInput.listeners.input();return {nameInput,seedInput};
}
test('new-career English form and shell use localized labels without creating or reading again',async()=>{
 const x=setup();try{await tick();assert.ok(findButton(x.root,'Start my career'));assert.match(text(x.root),/Choose your footballer/);assert.match(text(x.root),/Story options/);assert.doesNotMatch(text(x.root),/Nueva partida|Nombre y apellido|Carrera de futbolista/);assert.equal(x.calls.reads,1);assert.equal(x.calls.creates.length,0);assert.equal(x.calls.writes.length,0);}finally{x.close();}
});
test('locale changes preserve name, code, expanded options and focused field',async()=>{
 const x=setup();try{await tick();const {nameInput}=enter(x.root);nameInput.focus();const advanced=all(x.root).find(n=>n.tagName==='DETAILS');advanced.open=true;advanced.listeners.toggle();
  x.i18n.setLocale('es');assert.equal(findInput(x.root,'Nombre y apellido de la nueva carrera').value,'Álex D’Avila');assert.equal(findInput(x.root,'Código de historia de la nueva carrera').value,'207');assert.equal(x.root.ownerDocument.activeElement.dataset.entryField,'name');assert.equal(all(x.root).find(n=>n.tagName==='DETAILS').open,true);
  x.i18n.setLocale('en');assert.equal(findInput(x.root,'Story code for the new career').value,'207');assert.equal(x.calls.reads,1);assert.equal(x.calls.writes.length,0);
 }finally{x.close();}
});
test('English validation is readable and never sends an invalid creation',async()=>{
 const x=setup();try{await tick();findButton(x.root,'Start my career').click();assert.match(text(x.root),/Enter the player’s name/);enter(x.root,'Álex','');findButton(x.root,'Start my career').click();assert.match(text(x.root),/Enter a story code between 0 and 4294967295/);assert.equal(x.calls.creates.length,0);assert.equal(x.calls.writes.length,0);assert.equal(findInput(x.root,'First and last name for the new career').value,'Álex');}finally{x.close();}
});
test('changing locale keeps the replacement dialog and one confirmed write with the same backup',async()=>{
 const x=setup({initialLocale:'es',old:'existing-save'});try{await tick();enter(x.root);findButton(x.root,'Empezar mi carrera').click();await tick();const dialog=x.root.querySelector('dialog[open]');assert.ok(dialog);assert.equal(x.dispose.canLeave(),false);
  x.i18n.setLocale('en');assert.equal(x.root.querySelector('dialog[open]'),dialog);assert.equal(dialog.lang,'en');assert.match(text(dialog),/Your current save will become the previous backup/);assert.ok(findButton(dialog,'Confirm'));assert.equal(x.calls.creates.length,0);assert.equal(x.calls.reads,2);
  const confirm=findButton(dialog,'Confirm');confirm.click();confirm.click();await tick();assert.deepEqual(x.calls.creates,[{seed:207,name:'Álex D’Avila'}]);assert.equal(x.calls.writes.length,1);assert.equal(x.calls.writes[0].previous,'existing-save');
 }finally{x.close();}
});
test('English creation stays locked during locale changes and commits only once',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const x=setup({createGate:gate});
 try{await tick();enter(x.root);findButton(x.root,'Start my career').click();await tick();assert.equal(x.dispose.canLeave(),false);assert.match(text(x.root),/Creating your career…/);assert.equal(findButton(x.root,'Menu').disabled,true);
  x.i18n.setLocale('es');assert.equal(x.dispose.canLeave(),false);assert.match(text(x.root),/Creando tu carrera…/);x.root.listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(x.calls.menus,0);assert.equal(x.calls.creates.length,1);
  release();await tick();assert.equal(x.calls.writes.length,1);assert.equal(x.dispose.canLeave(),true);
 }finally{release();x.close();}
});
test('English failure preserves the draft and Spanish retains the original recovery context',async()=>{
 const x=setup({failCreate:true});try{await tick();enter(x.root);findButton(x.root,'Start my career').click();await tick();assert.match(text(x.root),/Could not complete this action/);assert.doesNotMatch(text(x.root),/Error interno sin traducir/);assert.equal(findInput(x.root,'Story code for the new career').value,'207');assert.equal(x.calls.writes.length,0);
  x.i18n.setLocale('es');assert.match(text(x.root),/Error interno sin traducir/);assert.equal(findInput(x.root,'Nombre y apellido de la nueva carrera').value,'Álex D’Avila');
 }finally{x.close();}
});
test('loading exit stays enabled in English and disposal removes locale updates',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const x=setup({readGate:gate});
 try{assert.match(text(x.root),/Loading…/);assert.equal(x.dispose.canLeave(),true);assert.equal(findButton(x.root,'Menu').disabled,false);x.dispose();x.i18n.setLocale('es');release(null);await tick();assert.equal(x.root.children.length,0);assert.equal(x.calls.creates.length,0);assert.equal(x.calls.writes.length,0);}finally{release(null);x.close();}
});
