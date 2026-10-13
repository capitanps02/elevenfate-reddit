import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession as EngineSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import {createPresentationLocale,presentationCatalog} from '../client/presentation-locale.mjs';
import {careerInteractiveCatalog} from '../i18n/career-interactive-catalog.mjs';
import {makeGameRoot,all,text,findButton} from './game-entry-dom.mjs';

const original=(await EngineSession.create(424242,{events:[]})).getView();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(screen,patch={}){
 const previousStorage=globalThis.localStorage;
 globalThis.localStorage={getItem:()=>null,setItem(){}};
 const root=makeGameRoot(),i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale:'en'});
 const v={...structuredClone(original),date:'2026-07-08',revision:7,screen,cutscene:null,...patch};
 const before=JSON.stringify(v),calls={reads:0,writes:0,commands:[]};
 const session={getView:()=>v,dispatch:async command=>{calls.commands.push(command);}};
 const store={read:async()=>{calls.reads++;return 'saved';},legacyChanged:async()=>false,hasPrevious:()=>false,write:async()=>{calls.writes++;},close:async()=>{}};
 const dispose=mountGame({root,GameSession:{migrateFromSave:async()=>session},saveStore:store,assets:{},css:'',compactHome:false,initialView:'home',autoCreateOnLoad:false,deferAutoResume:true,presentationLocale:i18n,onMenu(){}});
 return {root,i18n,v,before,calls,close(){dispose();globalThis.localStorage=previousStorage;}};
}
function commandWithoutNonce(cmd){const {commandId,...rest}=cmd;return rest;}
test('cinematic/offer copy is paired by ID and never enables English in production',()=>{
 assert.equal(Object.keys(careerInteractiveCatalog.es).length,38);
 assert.deepEqual(Object.keys(careerInteractiveCatalog.es).sort(),Object.keys(careerInteractiveCatalog.en).sort());
 for(const id of Object.keys(careerInteractiveCatalog.es)){
  const placeholders=s=>[...s.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(placeholders(careerInteractiveCatalog.es[id]),placeholders(careerInteractiveCatalog.en[id]),id);
  assert.equal(presentationCatalog.en[id],careerInteractiveCatalog.en[id]);
 }
 assert.equal(createPresentationLocale().setLocale('en'),false);
});
test('decision copy, accessible choice group and focus translate, with identical canonical choice command',async()=>{
 const d={instanceId:'decision-instance',family:'team',title:'Título canónico',body:'Narrativa canónica sin traducir',choices:[{id:'choice-one',label:'Elección canónica'},{id:'choice-two',label:'Otra elección'}],visible:['Información canónica'],uncertain:['Duda canónica'],memories:[]};
 const x=setup('decision',{decision:d,result:null,offer:null});
 try{await tick();findButton(x.root,'A decision awaits').click();
  assert.match(text(x.root),/A MOMENT THAT MATTERS/);assert.match(text(x.root),/What you know · what remains to be discovered/);
  const group=all(x.root).find(n=>n.attributes.role==='group'&&n.attributes['aria-label']==='Decision options');
  assert.ok(group);const choice=all(x.root).find(n=>n.dataset.localeFocus==='choice-choice-one');assert.ok(choice);
  choice.focus();x.i18n.setLocale('es');
  assert.equal(x.root.ownerDocument.activeElement.dataset.localeFocus,'choice-choice-one');
  assert.match(text(x.root),/UN MOMENTO QUE CUENTA/);
  assert.match(text(x.root),/Narrativa canónica sin traducir/);
  assert.equal(x.calls.commands.length,0);assert.equal(x.calls.writes,0);
  x.root.ownerDocument.activeElement.click();await tick();
  assert.deepEqual(commandWithoutNonce(x.calls.commands[0]),{type:'choose',expectedRevision:7,pendingInstanceId:'decision-instance',choiceId:'choice-one'});
  assert.equal(x.calls.commands.length,1);assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.reads,1);
 }finally{x.close();}
});
test('result copy and match summary translate without changing outcomes, deltas or acknowledgement',async()=>{
 const r={title:'Resultado canónico',choiceLabel:'Opción original',visibleEffects:[{label:'Forma',delta:2,favorable:true}],narrativeEffects:['Mensaje canónico'],hiddenEffects:[],messages:['Mensaje canónico']};
 const x=setup('result',{result:r,decision:null,offer:null,resultCategory:'match'});
 try{await tick();findButton(x.root,'Return to your decision').click();
  assert.match(text(x.root),/AFTER YOUR DECISION/);assert.match(text(x.root),/YOUR DECISION/);
  assert.match(text(x.root),/Consequences/);assert.match(text(x.root),/Match summary/);
  assert.match(text(x.root),/Mensaje canónico/);
  assert.equal(x.calls.commands.length,0);
  const next=findButton(x.root,'Continue');next.focus();x.i18n.setLocale('es');
  assert.equal(x.root.ownerDocument.activeElement.dataset.localeFocus,'result-continue');
  assert.ok(findButton(x.root,'Continuar'));findButton(x.root,'Continuar').click();await tick();
  assert.deepEqual(commandWithoutNonce(x.calls.commands[0]),{type:'acknowledge',expectedRevision:7});
  assert.equal(x.calls.writes,0);assert.equal(JSON.stringify(x.v),x.before);
 }finally{x.close();}
});
test('offer terms, loan policy and focus translate but offerId/action and facts remain stable',async()=>{
 const o={id:'offer-1',reason:'Propuesta canónica',date:'2026-07-08',before:{club:'Team A',ownerClub:'Team A',registrationClub:'Team A',leagueTier:2,salary:1000,months:6,releaseClause:null,loan:false},terms:{club:'Team B',ownerClub:'Team B',registrationClub:'Team B',leagueTier:1,salary:1200,months:12,releaseClause:2000,loan:true}};
 const x=setup('offer',{offer:o,decision:null,result:null,offerHistory:[]});
 try{await tick();findButton(x.root,'Review offer').click();const beforeLocale=JSON.stringify(x.v);
  assert.match(text(x.root),/Parent club/);assert.match(text(x.root),/Registration club/);assert.match(text(x.root),/This offer is a loan/);
  assert.match(text(x.root),/12 months/);assert.match(text(x.root),/Your agent will only accept/);assert.match(text(x.root),/Propuesta canónica/);
  const b=findButton(x.root,'Delegate this offer');b.focus();x.i18n.setLocale('es');
  assert.equal(x.root.ownerDocument.activeElement.dataset.localeFocus,'offer-delegate');
  assert.ok(findButton(x.root,'Delegar esta oferta'));
  assert.match(text(x.root),/La propuesta es una cesión/);assert.equal(x.calls.commands.length,0);
  x.i18n.setLocale('en');findButton(x.root,'Delegate this offer').click();await tick();
  assert.deepEqual(commandWithoutNonce(x.calls.commands[0]),{type:'offer',expectedRevision:7,offerId:'offer-1',action:'delegate'});
  assert.equal(x.calls.commands.length,1);assert.equal(x.calls.writes,0);assert.equal(JSON.stringify(x.v),beforeLocale);
 }finally{x.close();}
});
