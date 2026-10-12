import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDaily} from '../client/daily.mjs';
import {createPresentationLocale} from '../client/presentation-locale.mjs';
import {makeGameRoot,findButton,all,text} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const locale=initialLocale=>createPresentationLocale({availableLocales:['es','en'],initialLocale});
const intro={started:false,config:{id:'day-1',day:'2026-10-12',decisions:30}};
const view={revision:7,age:18,club:'Real Club',technique:52,form:63,fitness:78,stage:{stageId:0,from:18,to:20,name:'Primeros pasos'}};
async function mounted(i18n,response,run,fetchOverride){
 const root=makeGameRoot(),oldDocument=globalThis.document,oldFetch=globalThis.fetch,calls=[];
 globalThis.document=root.ownerDocument;
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return fetchOverride?fetchOverride(url,options):{ok:true,json:async()=>response};};
 let dispose;
 try{dispose=mountDaily({root,onClose(){},i18n,returnTo:'cover'});await tick();await run({root,dispose,calls});}
 finally{dispose?.();globalThis.document=oldDocument;globalThis.fetch=oldFetch;}
}
test('Daily intro, rules and ranking follow the shared locale without starting an attempt',async()=>{
 const i18n=locale('en');
 await mounted(i18n,{...intro,leaderboard:{total:1,limit:10,position:1,score:801,rows:[{position:1,score:801,you:true}]}},async({root,calls})=>{
  assert.equal(root.lang,'en');assert.ok(findButton(root,"Play today's Daily"));
  assert.equal(findButton(root,'←').attributes['aria-label'],'Back to menu');
  findButton(root,'?').click();assert.match(text(root),/A life in football/);assert.match(text(root),/One Daily attempt/);
  findButton(root,'Top').click();await tick();assert.match(text(root),/October 12 · 1 careers completed/);assert.match(text(root),/Your position · #1/);assert.match(text(root),/801 pts/);
  const reads=calls.length;i18n.setLocale('es');assert.match(text(root),/12 de octubre/);assert.equal(calls.length,reads);assert.ok(calls.every(c=>c.options.method==='GET'));
 });
});
test('language changes preserve write protection and do not duplicate a Daily start',async()=>{
 const i18n=locale('en');let finish;
 await mounted(i18n,intro,async({root,dispose,calls})=>{
  findButton(root,"Play today's Daily").click();await tick();assert.equal(dispose.canLeave(),false);assert.equal(findButton(root,'←').disabled,true);assert.match(text(root),/Saving…/);
  i18n.setLocale('es');assert.match(text(root),/Guardando…/);assert.equal(dispose.canLeave(),false);assert.equal(findButton(root,'←').disabled,true);
  i18n.setLocale('en');assert.match(text(root),/Saving…/);assert.equal(calls.length,2);
  assert.deepEqual(JSON.parse(calls[1].options.body),{dailyId:'day-1',action:'start',mode:'daily'});
  finish({ok:true,json:async()=>intro});await tick();assert.equal(dispose.canLeave(),true);
 },(_url,options)=>options.method==='GET'?{ok:true,json:async()=>intro}:new Promise(resolve=>{finish=resolve;}));
});
test('club choice command retains the original ID and revision in both locales',async()=>{
 const bodies=[];
 for(const language of ['es','en']){
  const response={...intro,started:true,resolved:0,view:{...view,screen:'club',clubs:[{id:'club-original',name:'Real Club',tier:2,role:70}]}};
  const snapshot=JSON.stringify(response);
  await mounted(locale(language),response,async({root,calls})=>{
   const choice=all(root).find(n=>n.dataset.choice==='club-original');assert.ok(choice);assert.match(text(choice),language==='en'?/Chance to start/:/Aspiras a ser titular/);
   choice.click();await tick();const body=JSON.parse(calls[1].options.body);assert.equal(typeof body.command.commandId,'string');delete body.command.commandId;bodies.push(body);
   assert.equal(JSON.stringify(response),snapshot);
  });
 }
 assert.deepEqual(bodies[0],bodies[1]);assert.equal(bodies[0].command.choiceId,'club-original');assert.equal(bodies[0].command.expectedRevision,7);
});
test('translated fallback selection and pending marker survive a locale change without changing IDs',async()=>{
 const i18n=locale('en');let finish;
 const response={...intro,started:true,resolved:1,view:{...view,screen:'decision',decision:{eventId:'DAILY_0_0',original:false,title:'Un sitio en el vestuario',body:'Texto original ES',choices:[{id:'c0',label:'Trabajar una variante técnica'}]},lastMessage:'Consecuencia original'}};
 await mounted(i18n,response,async({root,calls})=>{
  assert.match(text(root),/DECISION 2 OF 30/);assert.match(text(root),/Finding your place in the dressing room/);assert.equal(root.dataset.storyTranslation,'ready');
  all(root).find(n=>n.dataset.choice==='c0').click();await tick();i18n.setLocale('es');
  const choice=all(root).find(n=>n.dataset.choice==='c0');assert.equal(choice.classList.contains('selected'),true);assert.equal(choice.disabled,true);assert.equal(calls.length,2);
  assert.match(text(root),/DECISIÓN 2 DE 30/);assert.match(text(root),/Un sitio en el vestuario/);assert.match(text(root),/Consecuencia original/);assert.equal(JSON.parse(calls[1].options.body).command.choiceId,'c0');
  finish({ok:true,json:async()=>response});await tick();
 },(_url,options)=>options.method==='GET'?{ok:true,json:async()=>response}:new Promise(resolve=>{finish=resolve;}));
});
test('summary and finished UI translate while scores and honours stay unchanged',async()=>{
 const part={stageId:0,from:18,to:20,name:'Primeros pasos',club:'Real Club',role:50,played:20,starts:10,goals:3,assists:2,titles:[],awards:[]};
 await mounted(locale('en'),{...intro,started:true,view:{...view,screen:'summary',summary:part,nextStage:{from:20,to:23}}},async({root})=>{
  assert.match(text(root),/AGES 18–20/);assert.match(text(root),/First steps/);assert.match(text(root),/Started 50%/);assert.ok(findButton(root,'Next stage · 20–23 →'));assert.match(text(root),/Matches/);
 });
 await mounted(locale('en'),{...intro,started:true,finished:true,score:{total:811},view:{...view,totals:part,titles:[{title:'Trofeo original',season:'2026-27',club:'Real Club'}],awards:[],summaries:[part],history:[{age:18,title:'Historia original',choice:'Elección original'}]}},async({root})=>{
  assert.match(text(root),/811 points/);assert.match(text(root),/Team honours/);assert.match(text(root),/Trofeo original/);assert.match(text(root),/Age 18 · Historia original/);assert.ok(findButton(root,"View today's leaderboard"));
 });
});
test('sports UI translates without changing season IDs, rows, names or scores',async()=>{
 const league={id:'2026-27',division:'División original',rows:[{id:'club-a',name:'Real Club',you:true,position:1,played:2,gf:4,ga:1,points:6}],teams:[{id:'club-a',name:'Real Club'},{id:'club-b',name:'Other Club'}],matches:[{date:'2026-10-12',round:4,home:0,away:1,hg:2,ag:1,penalties:{home:5,away:4}}]};
 const response={...intro,started:true,view:{...view,screen:'club',clubs:[],league,seasons:[{id:league.id,club:'Real Club'}],continental:{qualified:false,rows:[],teams:[],matches:[],format:'Formato original'}}};
 await mounted(locale('en'),response,async({root})=>{
  findButton(root,'Seasons · results and tables').click();assert.match(text(root),/League table/);assert.match(text(root),/División original/);assert.equal(all(root).find(n=>n.tagName==='OPTION').value,'2026-27');
  findButton(root,'Results').click();assert.match(text(root),/Matchday 4/);assert.match(text(root),/Real Club 2–1 Other Club/);assert.match(text(root),/Penalties 5–4/);
  findButton(root,'Champions League').click();assert.match(text(root),/Your team did not qualify/);
 });
});
test('Daily errors retain Spanish recovery context and use localized English fallback',async()=>{
 for(const language of ['es','en']){const i18n=locale(language);await mounted(i18n,null,async({root})=>{
  assert.match(text(root),language==='es'?/El reto cambió en otra sesión/:/Could not open today's challenge/);
  assert.ok(findButton(root,language==='es'?'Recuperar intento':'Recover my attempt'));
  i18n.setLocale('en');assert.doesNotMatch(text(root),/El reto cambió/);assert.match(text(root),/Could not open today's challenge/);
 },()=>({ok:false,json:async()=>({error:'El reto cambió en otra sesión. Recupera tu intento.'})}));}
});
test('disposing Daily removes the shared locale listener and late read cannot redraw',async()=>{
 const i18n=locale('en');let finish;
 await mounted(i18n,null,async({root,dispose,calls})=>{
  assert.equal(dispose.canLeave(),true);dispose();i18n.setLocale('es');finish({ok:true,json:async()=>intro});await tick();assert.equal(root.children.length,0);assert.equal(calls.length,1);
 },()=>new Promise(resolve=>{finish=resolve;}));
});

test('an uncovered original story is blocked in English preview and returns intact in Spanish',async()=>{
 const i18n=locale('en');const response={...intro,started:true,resolved:1,view:{...view,screen:'decision',decision:{eventId:'EVT_REAL',original:true,title:'Historia real',body:'Texto real',choices:[{id:'REAL_CHOICE',label:'Respuesta real'}]}}};
 const before=JSON.stringify(response);
 await mounted(i18n,response,async({root,calls})=>{
  assert.equal(root.dataset.storyTranslation,'unavailable');assert.match(text(root),/Story available in Spanish/);assert.doesNotMatch(text(root),/Historia real/);assert.equal(all(root).filter(n=>n.dataset.choice).length,0);assert.equal(calls.length,1);
  i18n.setLocale('es');assert.equal(root.dataset.storyTranslation,'ready');assert.match(text(root),/Historia real/);assert.ok(all(root).find(n=>n.dataset.choice==='REAL_CHOICE'));assert.equal(calls.length,1);assert.equal(JSON.stringify(response),before);
 });
});
