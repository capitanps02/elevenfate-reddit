import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession as EngineSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import {createPresentationLocale} from '../client/presentation-locale.mjs';
import {makeGameRoot,all,text,findButton,findInput} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const original=(await EngineSession.create(424242)).getView();
function setup({locale='en',view='profile',failure=false,news=[],months=5}={}){
 const previousStorage=globalThis.localStorage;globalThis.localStorage={getItem:()=>null,setItem(){}};
 const root=makeGameRoot(),i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale:locale}),v={...structuredClone(original),screen:'career',cutscene:null,revision:7,news,contractMonths:months,salaryMonthly:1250};
 const before=JSON.stringify(v),calls={reads:0,writes:0,commands:[]};
 const session={getView:()=>v,dispatch:async command=>{calls.commands.push(command);if(failure)throw Error('Fallo de guardado del nombre');if(command.type==='identity')v.player.displayName=command.displayName;}};
 const store={read:async()=>{calls.reads++;return 'save';},legacyChanged:async()=>false,hasPrevious:()=>false,close:async()=>{},write:async()=>{calls.writes++;}};
 const dispose=mountGame({root,GameSession:{migrateFromSave:async()=>session},saveStore:store,assets:{},css:'',compactHome:true,initialView:view,autoCreateOnLoad:false,deferAutoResume:true,presentationLocale:i18n,onMenu(){}});
 return {root,i18n,v,calls,before,close(){dispose();globalThis.localStorage=previousStorage;}};
}
function enterName(x,value){const input=all(x.root).find(n=>n.dataset.entryField==='profile-name');input.value=value;input.listeners.input();input.focus();return input;}
test('Profile translates contract and metrics while preserving unsaved name and focus without a command',async()=>{
 const x=setup();try{await tick();assert.match(text(x.root),/Your profile/);assert.match(text(x.root),/Your contract/);assert.match(text(x.root),/Monthly salary/);assert.match(text(x.root),/5 months/);assert.match(text(x.root),/Your contract is nearing its end/);assert.match(text(x.root),/Current performance/);assert.doesNotMatch(text(x.root),/Tu contrato|Salario mensual|Tu perfil|Guardar nombre/);
 enterName(x,'Álex O’Neil');x.i18n.setLocale('es');assert.equal(findInput(x.root,'Nombre y apellido del jugador').value,'Álex O’Neil');assert.equal(x.root.ownerDocument.activeElement.dataset.entryField,'profile-name');x.i18n.setLocale('en');assert.equal(findInput(x.root,'Player’s first and last name').value,'Álex O’Neil');assert.equal(x.calls.reads,1);assert.deepEqual(x.calls.commands,[]);assert.equal(JSON.stringify(x.v),x.before);
 }finally{x.close();}
});
test('saving a profile name dispatches identical identity commands in Spanish and English',async()=>{
 const commands=[];for(const locale of ['es','en']){const x=setup({locale});try{await tick();enterName(x,'Álex O’Neil');findButton(x.root,locale==='es'?'Guardar nombre':'Save name').click();await tick();assert.equal(x.calls.commands.length,1);const {commandId,...command}=x.calls.commands[0];commands.push(command);assert.equal(x.v.player.displayName,'Álex O’Neil');assert.equal(all(x.root).find(n=>n.dataset.entryField==='profile-name').value,'Álex O’Neil');assert.equal(x.calls.writes,0);}finally{x.close();}}
 assert.deepEqual(commands,[{type:'identity',expectedRevision:7,displayName:'Álex O’Neil'},{type:'identity',expectedRevision:7,displayName:'Álex O’Neil'}]);
});
test('failed identity command retains the draft and original Spanish error across language changes',async()=>{
 const x=setup({failure:true});try{await tick();enterName(x,'Álex O’Neil');findButton(x.root,'Save name').click();await tick();assert.match(text(x.root),/Could not complete this action/);assert.equal(findInput(x.root,'Player’s first and last name').value,'Álex O’Neil');x.i18n.setLocale('es');assert.match(text(x.root),/Fallo de guardado del nombre/);assert.equal(findInput(x.root,'Nombre y apellido del jugador').value,'Álex O’Neil');assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.commands.length,1);}finally{x.close();}
});
test('World localizes wrappers and UTC dates, preserving public news text and newest-first ordering',async()=>{
 const x=setup({view:'world',news:[{date:'2026-07-01',text:'Noticia original uno'},{date:'2026-07-02',text:'Noticia original dos'}]});try{await tick();assert.match(text(x.root),/The world moves on/);assert.match(text(x.root),/Most recent first/);const cards=all(x.root).filter(n=>n.classList.contains('news-card'));assert.equal(cards[0].attributes['aria-label'],'News from 2 Jul 2026');assert.match(text(cards[0]),/Noticia original dos/);x.i18n.setLocale('es');assert.match(text(x.root),/El mundo sigue/);assert.equal(JSON.stringify(x.v),x.before);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
 const empty=setup({view:'world'});try{await tick();assert.match(text(empty.root),/No major news this week/);assert.match(text(empty.root),/Keep simulating/);assert.deepEqual(empty.calls.commands,[]);}finally{empty.close();}
});
test('Relationships translates its introduction without inferring roles or changing names and public contact data',async()=>{
 const x=setup({view:'relations'});try{await tick();assert.match(text(x.root),/The people in your story/);assert.match(text(x.root),/People who are already part of your career/);for(const c of x.v.contacts){assert.ok(text(x.root).includes(c.name));if(c.role)assert.ok(text(x.root).includes(c.role));}x.i18n.setLocale('es');assert.match(text(x.root),/Personas que ya forman parte de tu carrera/);assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.reads,1);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});

test('contract duration uses a singular month and switching language leaves its value unchanged',async()=>{
 const x=setup({months:1});try{await tick();assert.match(text(x.root),/1 month/);assert.doesNotMatch(text(x.root),/1 months/);x.i18n.setLocale('es');assert.match(text(x.root),/1 mes/);assert.doesNotMatch(text(x.root),/1 meses/);assert.equal(x.v.contractMonths,1);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});
