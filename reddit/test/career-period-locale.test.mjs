import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import {createPresentationLocale,presentationCatalog} from '../client/presentation-locale.mjs';
import {careerPeriodCatalog} from '../i18n/career-period-catalog.mjs';
import {makeGameRoot,all,text,findButton} from './game-entry-dom.mjs';
const original=(await GameSession.create(424242,{events:[]})).getView();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(summary){
 const previousStorage=globalThis.localStorage;globalThis.localStorage={getItem:()=>null,setItem(){}};
 const root=makeGameRoot(),i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale:'en'}),v={...structuredClone(original),screen:'career',cutscene:null,simulation:{...original.simulation,mode:'idle',summary}},before=JSON.stringify(v),calls={reads:0,writes:0,commands:[]};
 const session={getView:()=>v,dispatch:async command=>calls.commands.push(command)};
 const saveStore={read:async()=>{calls.reads++;return 'saved';},legacyChanged:async()=>false,hasPrevious:()=>false,close:async()=>{},write:async()=>{calls.writes++;}};
 const dispose=mountGame({root,GameSession:{migrateFromSave:async()=>session},saveStore,assets:{},css:'',compactHome:true,initialView:'career',autoCreateOnLoad:false,deferAutoResume:true,presentationLocale:i18n,onMenu(){}});
 return {root,i18n,v,before,calls,close(){dispose();globalThis.localStorage=previousStorage;}};
}
const sample=()=>({fromDate:'2026-07-01',toDate:'2026-07-08',daysSimulated:7,weeksSimulated:1,matches:{appearances:1},playerChanges:{form:3,fatigue:-2,fitness:1},careerChanges:{clubFrom:'UDV',clubTo:'UDV',roleFrom:'rotation',roleTo:'rotation'},worldHighlights:[],report:{context:[],fixtures:[]},interruption:null});

test('period catalogue has identical keys and placeholders; production English stays gated',()=>{
 assert.equal(Object.keys(careerPeriodCatalog.es).length,28);assert.deepEqual(Object.keys(careerPeriodCatalog.es).sort(),Object.keys(careerPeriodCatalog.en).sort());
 for(const key of Object.keys(careerPeriodCatalog.es)){assert.deepEqual(careerPeriodCatalog.es[key].match(/\{[^}]+\}/g),careerPeriodCatalog.en[key].match(/\{[^}]+\}/g));assert.equal(presentationCatalog.en[key],careerPeriodCatalog.en[key]);}
 const i18n=createPresentationLocale();assert.equal(i18n.setLocale('en'),false);assert.equal(i18n.getLocale(),'es');
});
test('period labels, dates, singular duration and fixture participation translate without changing the report or writing',async()=>{
 const summary=sample();summary.daysSimulated=1;summary.weeksSimulated=1;
 const participation=['Baja por lesión','Sancionado','No convocado','Suplente sin minutos','Titular','Entraste desde el banquillo'];
 summary.report.fixtures=participation.map((value,index)=>({date:'2026-07-08',club:'UDV',opponent:'Example Club '+index,homeAway:'home',homeGoals:index===0?null:2,awayGoals:index===0?null:1,participation:value,minutes:index<4?0:90,rating:index<4?null:7.4}));
 const x=setup(summary);try{await tick();const t=text(x.root);assert.match(t,/Period summary/);assert.match(t,/1 day · 1 week/);for(const label of ['Out injured','Suspended','Not in the squad','Unused substitute','Started','Came on as a substitute'])assert.ok(t.includes(label),label);assert.match(t,/Rating 7.4/);assert.match(t,/Matches in this period · 6/);assert.ok(findButton(x.root,'View match history'));x.i18n.setLocale('es');assert.match(text(x.root),/1 día · 1 semana/);assert.match(text(x.root),/Baja por lesión/);assert.match(text(x.root),/Nota 7,4/);assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.reads,1);assert.equal(x.calls.writes,0);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});
test('all public interruption types and unknown types display the correct guidance without resuming simulation',async()=>{
 const types=['decision','offer','important_injury','national_selection','role_change','career_change','season_complete','season_transition','retirement','max_auto_weeks','new_future_type'];
 for(const type of types){const summary=sample();summary.interruption={type};const x=setup(summary);try{await tick();const key='career.period.interruption.'+(type==='new_future_type'?'other':type);assert.ok(text(x.root).includes(careerPeriodCatalog.en[key]),type);x.i18n.setLocale('es');assert.ok(text(x.root).includes(careerPeriodCatalog.es[key]),type);assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.writes,0);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}}
});
test('uncertified participation gives availability guidance while original narratives and facts remain untouched',async()=>{
 const summary=sample();summary.daysSimulated=0;summary.weeksSimulated=0;summary.careerChanges.clubTo='Example Club';summary.careerChanges.roleTo='starter';summary.worldHighlights=['Noticia pública original'];summary.report.context=['Contexto narrativo original'];summary.report.fixtures=[{date:'2026-07-08',club:'UDV',opponent:'Example Club',homeAway:'away',homeGoals:null,awayGoals:null,participation:'Nueva participación',minutes:0,rating:null}];
 const x=setup(summary);try{await tick();assert.match(text(x.root),/0 days · 0 weeks/);assert.match(text(x.root),/Participation details are available in Español/);assert.match(text(x.root),/Noticia pública original/);assert.match(text(x.root),/Contexto narrativo original/);assert.match(text(x.root),/rotation → starter/);x.i18n.setLocale('es');assert.match(text(x.root),/Nueva participación/);assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.writes,0);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});
test('action detail shows translated public role and block, retaining selected target and disabled option on locale changes',async()=>{
 const x=setup(null);try{const a=x.v.actions.categories.find(c=>c.id==='career').actions.find(a=>a.id==='PA_COACH_TALK');a.available=true;a.unavailableReason=null;a.targets=[{id:'NPC_CCH_01',label:'Public coach name',role:'Entrenador',available:false,unavailableReason:'Tu estado físico actual no permite esta acción.',cooldownUntil:null,options:a.options.map(o=>({...o,available:false,unavailableReason:'Tu estado físico actual no permite esta acción.'}))}];await tick();findButton(x.root,'Manage my career').click();const byAria=label=>all(x.root).find(n=>n.attributes['aria-label']===label);byAria('View Career actions').click();byAria('Open Talk to the coach').click();assert.ok(all(x.root).some(n=>n.tagName==='P'&&text(n)==='Coach'));assert.match(text(x.root),/Your current physical condition does not allow this action/);assert.equal(findButton(x.root,'I want more minutes').disabled,true);x.i18n.setLocale('es');assert.equal(findButton(x.root,'Quiero más minutos').disabled,true);assert.match(text(x.root),/Tu estado físico actual no permite esta acción/);assert.equal(x.calls.writes,0);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});
