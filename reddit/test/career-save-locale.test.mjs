import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGame} from '../../web/game-ui.js';
import {createPresentationLocale} from '../client/presentation-locale.mjs';
import {makeGameRoot,all,text,findButton,findInput} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const snapshot={sessionId:'restored',revision:9,seed:207};
const playerView={screen:'home',season:'2026-27',date:'2026-07-01',player:{displayName:'Álex'},position:'striker',age:18,club:'CITY',form:70,fitness:70,fatigue:0,decisionsMade:2,simulation:{mode:'idle'}};
function setup({initialLocale='en',writeGate=null,writeError=null,old='confirmed-save',local=false}={}){
 const previousStorage=globalThis.localStorage;globalThis.localStorage={getItem:()=>null,setItem(){}};
 const root=makeGameRoot(),i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale}),calls={reads:0,migrations:[],writes:[],deletes:0,creates:0};
 const session={getView:()=>playerView,exportSnapshot:()=>snapshot};
 const store={read:async()=>{calls.reads++;return old;},readRaw:async()=>{calls.reads++;return old;},previous:async()=> 'previous-save',legacyChanged:async()=>false,legacyRaw:()=>local?'legacy-save':null,hasPrevious:()=>true,close:async()=>{},write:async(next,previous)=>{calls.writes.push({next,previous});if(writeGate)await writeGate;if(writeError)throw Error(writeError);},remove:async()=>{calls.deletes++;}};
 const GameSession={migrateFromSave:async(raw)=>{calls.migrations.push(raw);if(raw==='invalid')throw Error('detalle interno');return session;},create:async()=>{calls.creates++;throw Error('unexpected create');}};
 const dispose=mountGame({root,GameSession,saveStore:store,assets:{},css:'',saveDescription:local?'local':'reddit',compactHome:true,initialView:'save',autoCreateOnLoad:false,deferAutoResume:true,onMenu(){},presentationLocale:i18n});
 return {root,i18n,calls,dispose,close(){dispose();globalThis.localStorage=previousStorage;}};
}
function importBackup(x,file=new File(['backup'],'career.json',{type:'application/json'})){
 const input=findInput(x.root,x.i18n.getLocale()==='en'?'Import save backup':'Importar copia de partida');input.files=[file];input.listeners.change();
}
test('Your save translates Reddit recovery controls without creating, writing or reloading on language change',async()=>{
 const x=setup();try{await tick();assert.match(text(x.root),/saved in this Reddit community/);for(const label of ['Download backup','Restore current save','Restore previous backup','Delete Reddit career'])assert.ok(findButton(x.root,label));assert.ok(findInput(x.root,'Import save backup'));assert.doesNotMatch(text(x.root),/Copias y recuperación|Importar una copia|Copia anterior|Eliminar tu carrera/);
 x.i18n.setLocale('es');assert.match(text(x.root),/CONTINÚA DONDE LO DEJASTE/);assert.ok(findButton(x.root,'Recuperar copia anterior'));assert.equal(x.calls.reads,1);assert.equal(x.calls.creates,0);assert.deepEqual(x.calls.writes,[]);assert.equal(x.calls.deletes,0);
 }finally{x.close();}
});
test('local recovery and old backup use translated presentation without accessing Reddit',async()=>{
 const x=setup({local:true});try{await tick();assert.match(text(x.root),/Manage your local career save/);assert.match(text(x.root),/These options use local backups/);assert.ok(findButton(x.root,'Download old backup'));assert.doesNotMatch(text(x.root),/saved in this Reddit community/);}finally{x.close();}
});
test('import confirmation recomputes date and decision count when language changes, cancellation writes nothing',async()=>{
 const x=setup({initialLocale:'es'});try{await tick();importBackup(x);await tick();const dialog=x.root.querySelector('dialog[open]');assert.ok(dialog);assert.match(text(dialog),/2 decisiones/);x.i18n.setLocale('en');assert.equal(x.root.querySelector('dialog[open]'),dialog);assert.match(text(dialog),/2 decisions/);assert.match(text(dialog),/Save from 1 Jul 2026/);assert.ok(findButton(dialog,'Cancel'));assert.equal(x.dispose.canLeave(),false);findButton(dialog,'Cancel').click();assert.equal(x.dispose.canLeave(),true);assert.deepEqual(x.calls.writes,[]);assert.equal(x.calls.reads,2);}finally{x.close();}
});
test('import confirmation preserves the exact snapshot and backup, blocking double activation and locale changes during write',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const x=setup({writeGate:gate});try{await tick();importBackup(x);await tick();const confirm=findButton(x.root.querySelector('dialog[open]'),'Confirm');confirm.click();confirm.click();await tick();x.i18n.setLocale('es');assert.equal(x.dispose.canLeave(),false);assert.equal(findButton(x.root,'Portada').disabled,true);assert.deepEqual(x.calls.writes,[{next:snapshot,previous:'confirmed-save'}]);release();await tick();assert.equal(x.dispose.canLeave(),true);assert.equal(x.calls.writes.length,1);assert.equal(x.calls.creates,0);}finally{release();x.close();}
});
test('oversized and invalid imports show recoverable English errors and never write',async()=>{
 const x=setup();try{await tick();importBackup(x,{size:8*1024*1024+1,text(){throw Error('must not read');}});await tick();assert.match(text(x.root),/backup exceeds 8 MiB/);importBackup(x,new File(['invalid'],'bad.json'));await tick();assert.match(text(x.root),/Check that it is compatible/);assert.doesNotMatch(text(x.root),/detalle interno/);x.i18n.setLocale('es');assert.match(text(x.root),/No se pudo importar. detalle interno/);assert.deepEqual(x.calls.writes,[]);assert.equal(x.calls.reads,1);}finally{x.close();}
});
test('confirmed import conflict retains recovery advice in both languages without retrying write',async()=>{
 const conflict='La carrera cambió en otro dispositivo. Recupera la partida actual antes de continuar.';const x=setup({writeError:conflict});try{await tick();importBackup(x);await tick();findButton(x.root.querySelector('dialog[open]'),'Confirm').click();await tick();assert.match(text(x.root),/career changed on another device/);assert.match(text(x.root),/Restore the current save before continuing/);x.i18n.setLocale('es');assert.match(text(x.root),/La carrera cambió en otro dispositivo/);assert.equal(x.calls.writes.length,1);assert.equal(x.calls.deletes,0);}finally{x.close();}
});
test('deletion confirmation translates in place and cancel never calls remove',async()=>{
 const x=setup();try{await tick();findButton(x.root,'Delete Reddit career').click();const dialog=x.root.querySelector('dialog[open]');assert.match(text(dialog),/cannot be undone/);x.i18n.setLocale('es');assert.equal(x.root.querySelector('dialog[open]'),dialog);assert.match(text(dialog),/Esta acción no se puede deshacer/);findButton(dialog,'Cancelar').click();assert.equal(x.calls.deletes,0);assert.equal(x.calls.writes.length,0);}finally{x.close();}
});
test('no-save download and previous recovery do not create a career',async()=>{
 const x=setup({old:null});try{await tick();assert.doesNotMatch(text(x.root),/Autosave active|latest saved state/);findButton(x.root,'Download backup').click();await tick();assert.match(text(x.root),/There is no saved career/);assert.ok(findButton(x.root,'Retry loading'));findButton(x.root,'Restore previous backup').click();await tick();assert.ok(x.root.querySelector('dialog[open]'));assert.equal(x.calls.creates,0);assert.equal(x.calls.writes.length,0);}finally{x.close();}
});
