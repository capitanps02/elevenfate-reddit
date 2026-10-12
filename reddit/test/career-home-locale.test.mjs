import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession as EngineSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import {createPresentationLocale} from '../client/presentation-locale.mjs';
import {makeGameRoot,all,text,findButton} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const original=(await EngineSession.create(424242)).getView();
function setup({locale='en',compact=true,screen='career',mode='idle',position='striker',sports=null,adapter=true}={}){
 const previousStorage=globalThis.localStorage;globalThis.localStorage={getItem:()=>null,setItem(){}};
 const root=makeGameRoot(),windowListeners={};root.ownerDocument.defaultView.addEventListener=(name,fn)=>{windowListeners[name]=fn;};root.ownerDocument.defaultView.removeEventListener=(name)=>{delete windowListeners[name];};const i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale:locale});
 const v={...structuredClone(original),screen,position,player:{...original.player,displayName:'Álex D’Avila'},decision:null,result:null,offer:null,cutscene:null,revision:7,date:'2026-07-01',season:'2026-27',age:18,form:73,fitness:81,fatigue:12,appearances:1,simulation:{mode,maxWeeks:4,elapsedDays:7}};
 if(screen==='offer')v.offer={id:'offer-1'};
 const before=JSON.stringify(v),sportsBefore=JSON.stringify(sports),calls={reads:0,writes:0,migrations:0,commands:[],daily:0};
 const session={getView:()=>v,dispatch:async command=>{calls.commands.push(command);}};
 const store={read:async()=>{calls.reads++;return 'confirmed-save';},legacyChanged:async()=>false,hasPrevious:()=>false,close:async()=>{},write:async()=>{calls.writes++;}};
 const dispose=mountGame({root,GameSession:{migrateFromSave:async()=>{calls.migrations++;return session;}},saveStore:store,assets:{},css:'',compactHome:compact,initialView:'home',autoCreateOnLoad:false,deferAutoResume:true,onDaily:()=>calls.daily++,onMenu(){},...(adapter?{presentationLocale:i18n}:{}),...(sports?{careerSports:()=>sports}:{})});
 return {root,i18n,calls,v,dispose,windowListeners,before,sportsBefore,close(){dispose();globalThis.localStorage=previousStorage;}};
}
const fixture={club:'Example City',season:'2026-27',division:'División Nacional',position:2,points:7,recent:[{date:'2026-07-01',homeAway:'home',opponent:'Example United',result:{homeGoals:2,awayGoals:1}}],upcoming:[{date:'2026-07-08',homeAway:'away',opponent:'Example Athletic'}],rows:[{position:1,name:'Example United',played:3,gf:6,ga:2,points:9},{position:2,name:'Example City',played:3,gf:4,ga:3,points:7,you:true}],league:{teams:[{name:'Example City'},{name:'Example United'}],matches:[{date:'2026-07-01',round:1,home:0,away:1,hg:2,ag:1}]},continental:null};
test('compact career Home localizes player, meters, Daily and action without mutating public view',async()=>{
 const x=setup();try{await tick();assert.match(text(x.root),/YOUR CAREER/);assert.match(text(x.root),/Striker · Age 18/);assert.match(text(x.root),/Form73Fitness81Fatigue12/);assert.ok(findButton(x.root,'Simulate next match'));assert.match(text(x.root),/30 decisions. An entire career./);assert.doesNotMatch(text(x.root),/TU CARRERA|Delantero|Tu siguiente capítulo|RETO DEL DÍA/);assert.equal(all(x.root).find(n=>n.tagName==='PROGRESS').attributes['aria-label'],'Form 73 out of 100');x.i18n.setLocale('es');assert.ok(findButton(x.root,'Simular próximo partido'));assert.match(text(x.root),/Delantero · 18 años/);assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.reads,1);assert.equal(x.calls.migrations,1);assert.equal(x.calls.writes,0);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});
test('English and Spanish simulation dispatch the same type, revision and maxDays',async()=>{
 const results=[];
 for(const locale of ['es','en']){const x=setup({locale});try{await tick();findButton(x.root,locale==='es'?'Simular próximo partido':'Simulate next match').click();await tick();assert.equal(x.calls.commands.length,1);const {commandId,...command}=x.calls.commands[0];assert.equal(typeof commandId,'string');results.push(command);assert.equal(x.calls.writes,0);}finally{x.close();}}
 assert.deepEqual(results,[{type:'continue',expectedRevision:7,maxDays:90},{type:'continue',expectedRevision:7,maxDays:90}]);
});
test('each pending state keeps its primary action, without a command on language change',async()=>{
 for(const [screen,mode,label] of [['offer','idle','Review offer'],['decision','idle','A decision awaits'],['result','idle','Return to your decision'],['epilogue','idle','View my career'],['summary','idle','Keep simulating'],['career','auto_simulating','Resume simulation'],['career','paused','Resume simulation']]){
  const x=setup({screen,mode});try{await tick();const action=findButton(x.root,label);assert.ok(action,screen+'/'+mode);assert.equal(action.classList.contains('primary'),true);x.i18n.setLocale('es');x.i18n.setLocale('en');assert.ok(findButton(x.root,label));assert.deepEqual(x.calls.commands,[]);assert.equal(JSON.stringify(x.v),x.before);}finally{x.close();}
 }
});
test('full shared Home preserves the primary automatic simulation command in both languages and default Spanish',async()=>{
 for(const [locale,adapter,label] of [['es',true,'Simular'],['en',true,'Simulate'],['es',false,'Simular']]){const x=setup({locale,adapter,compact:false});try{await tick();const action=findButton(x.root,label);assert.ok(action);assert.equal(action.classList.contains('primary'),true);action.click();await tick();const {commandId,...command}=x.calls.commands[0];assert.deepEqual(command,{type:'auto',expectedRevision:7,action:'start'});}finally{x.close();}}
});
test('simulation progress and accessible status keep numbers and limits while changing language',async()=>{
 const x=setup({compact:false,mode:'paused'});try{await tick();assert.match(text(x.root),/7 of 28 days · 25%/);const progress=all(x.root).find(n=>Object.hasOwn(n.dataset,'p5AutoProgress'));assert.equal(progress.value,7);assert.equal(progress.max,28);assert.equal(progress.attributes['aria-label'],'Simulation progress: 7 of 28 days, 25%');assert.match(text(x.root),/Game paused/);x.i18n.setLocale('es');const spanish=all(x.root).find(n=>Object.hasOwn(n.dataset,'p5AutoProgress'));assert.equal(spanish.value,7);assert.equal(spanish.max,28);assert.equal(spanish.attributes['aria-label'],'Progreso de la simulación: 7 de 28 días, 25 %');assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});
test('positions use stable enums, and unknown positions retain a neutral player label',async()=>{
 for(const [position,label] of [['winger','Winger'],['midfielder','Midfielder'],['defender','Defender'],['goalkeeper','Goalkeeper'],['unknown','Footballer']]){const x=setup({position});try{await tick();assert.match(text(x.root),new RegExp(label+' · Age 18'));assert.equal(x.v.position,position);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}}
});
test('calendar keeps selected tab and open dialog across language changes, with identical scores and no writes',async()=>{
 const sports=structuredClone(fixture),x=setup({sports});try{await tick();assert.ok(findButton(x.root,'League · #2 · 7 pts'));assert.match(text(x.root),/NEXT · /);findButton(x.root,'League · #2 · 7 pts').click();const dialog=x.root.querySelector('dialog[open]');assert.ok(dialog);findButton(dialog,'Results').click();assert.match(text(dialog),/Matchday 1 · 1 Jul 2026/);assert.match(text(dialog),/2 – 1/);x.i18n.setLocale('es');assert.equal(x.root.querySelector('dialog[open]'),dialog);assert.match(text(dialog),/Jornada 1/);assert.equal(findButton(dialog,'Resultados').attributes['aria-pressed'],'true');x.i18n.setLocale('en');assert.equal(findButton(dialog,'Results').attributes['aria-pressed'],'true');findButton(dialog,'Close').click();assert.equal(x.root.querySelector('dialog[open]'),null);assert.equal(JSON.stringify(sports),x.sportsBefore);assert.equal(JSON.stringify(x.v),x.before);assert.equal(x.calls.reads,1);assert.equal(x.calls.writes,0);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});
test('empty league and continental calendar show translated guidance without fabricated scores',async()=>{
 const sports={...structuredClone(fixture),position:null,points:0,recent:[],upcoming:[],rows:[],league:null,continental:null};const x=setup({sports});try{await tick();assert.ok(findButton(x.root,'League · Not started'));assert.match(text(x.root),/No scheduled fixtures/);findButton(x.root,'League · Not started').click();const dialog=x.root.querySelector('dialog[open]');findButton(dialog,'Results').click();assert.match(text(dialog),/No matchdays played yet/);findButton(dialog,'Champions').click();assert.match(text(dialog),/Available with the new competition calendar/);assert.equal(x.calls.writes,0);assert.deepEqual(x.calls.commands,[]);}finally{x.close();}
});

test('primary and navigation focus follow the same control after changing language',async()=>{
 const x=setup();try{await tick();findButton(x.root,'Simulate next match').focus();x.i18n.setLocale('es');assert.equal(x.root.ownerDocument.activeElement,findButton(x.root,'Simular próximo partido'));findButton(x.root,'Tu partida').focus();x.i18n.setLocale('en');assert.equal(x.root.ownerDocument.activeElement,findButton(x.root,'Your save'));assert.deepEqual(x.calls.commands,[]);assert.equal(x.calls.reads,1);}finally{x.close();}
});
test('history navigation clears a removed calendar dialog and subsequent locale changes update the live page',async()=>{
 const x=setup({sports:structuredClone(fixture)});try{await tick();findButton(x.root,'League · #2 · 7 pts').click();assert.ok(x.root.querySelector('dialog[open]'));x.windowListeners.popstate({state:{mhOwner:true,mhView:'home',mhCinematic:false}});assert.equal(x.root.querySelector('dialog[open]'),null);x.i18n.setLocale('es');assert.ok(findButton(x.root,'Simular próximo partido'));x.i18n.setLocale('en');assert.ok(findButton(x.root,'Simulate next match'));assert.deepEqual(x.calls.commands,[]);assert.equal(x.calls.writes,0);}finally{x.close();}
});
