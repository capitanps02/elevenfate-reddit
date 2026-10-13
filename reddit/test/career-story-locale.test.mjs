import test from 'node:test';
import assert from 'node:assert/strict';
import {EVENTS} from '../../dist/content/events/index.js';
import {GameSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import {careerStoryContent} from '../i18n/career-story-content.mjs';
import {presentCareerDecision} from '../client/career-story-locale.mjs';
import {createPresentationLocale} from '../client/presentation-locale.mjs';
import {makeGameRoot,all,text} from './game-entry-dom.mjs';

const event=EVENTS.find(event=>event.id==='EVT_18_PRE_001');
const publicDecision=()=>({eventId:event.id,instanceId:'pending-1',family:event.family,title:event.text.title,body:event.text.body,visible:[...event.intel.visible],uncertain:[...event.intel.uncertain],memories:[],choices:event.choices.map(choice=>({id:choice.id,label:choice.label}))});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('each translated scene has an exact public source copy and equal choice IDs in the final catalogue',()=>{
 assert.deepEqual(Object.keys(careerStoryContent.es),Object.keys(careerStoryContent.en));
 for(const [id,es] of Object.entries(careerStoryContent.es)){
  const source=EVENTS.find(event=>event.id===id);assert.ok(source,id);
  assert.deepEqual(es,{title:source.text.title,body:source.text.body,visible:source.intel.visible,uncertain:source.intel.uncertain,choices:Object.fromEntries(source.choices.map(choice=>[choice.id,choice.label]))});
  const en=careerStoryContent.en[id];assert.deepEqual(Object.keys(en.choices),Object.keys(es.choices));
  for(const value of [en.title,en.body,...en.visible,...en.uncertain,...Object.values(en.choices)])assert.equal(typeof value,'string');
  assert.equal(en.visible.length,es.visible.length);assert.equal(en.uncertain.length,es.uncertain.length);
 }
});
test('English changes public copy only; source, IDs, choice order and memories stay intact',()=>{
 const d=publicDecision();d.memories=[{journalIndex:2,title:'Recuerdo original'}];const before=JSON.stringify(d);
 const {decision:en,translated,reason}=presentCareerDecision(d,'en');
 assert.equal(translated,true);assert.equal(reason,null);assert.equal(en.title,'The 26-player list');
 assert.deepEqual(en.choices.map(choice=>choice.id),d.choices.map(choice=>choice.id));
 assert.equal(en.eventId,d.eventId);assert.equal(en.instanceId,d.instanceId);assert.equal(en.memories,d.memories);
 assert.equal(JSON.stringify(d),before);assert.equal(presentCareerDecision(d,'es').decision,d);
});
test('eligible choice subsets are translated in their original order without revealing absent choices',()=>{
 const d=publicDecision();d.choices=[d.choices[2],d.choices[0]];
 const en=presentCareerDecision(d,'en').decision;
 assert.deepEqual(en.choices.map(choice=>choice.id),['CALL_NO_ONE','CALL_NANO']);assert.equal(en.choices.length,2);
});
test('unknown or absent IDs never infer a scene from matching text, and preserve all controls',()=>{
 for(const eventId of ['UNKNOWN','__proto__',undefined]){
  const d={...publicDecision(),eventId};const result=presentCareerDecision(d,'en');
  assert.equal(result.reason,'missing');assert.equal(result.decision,d);
 }
 assert.equal(presentCareerDecision(null,'en').decision,null);
});
test('changed source or a new choice fails closed to original Spanish copy without changing eligibility',()=>{
 for(const patch of [{title:'Changed'},{body:'Changed'},{visible:['Changed']},{uncertain:[]},{choices:[{id:'NEW',label:'New'}]}]){
  const d={...publicDecision(),...patch};const result=presentCareerDecision(d,'en');assert.equal(result.reason,'stale');assert.equal(result.decision,d);
 }
});

const fixture=()=>({id:'PUBLIC_ID_TEST',ageWindow:[18,18],phase:'18_20',family:'team',gates:[],cooldown:99999,weight:100,text:{title:'Public scene',body:'Public body'},intel:{visible:['Public information'],uncertain:[]},choices:[{id:'A',label:'Choice A',intentTags:[],immediateEffects:[],hiddenCosts:[],followUps:[],outcomeIds:['OUT_A']}],outcomes:[{id:'OUT_A',baseWeight:1,effects:[],messages:['Public result']}],tags:[],canonStatus:'technical_adaptation'});
async function reachDecision(session){for(let i=0;i<20;i++){if(session.getView().decision)return session.getView().decision;await session.dispatch({type:'continue',commandId:'advance-'+i,expectedRevision:session.getView().revision,maxDays:1});}throw Error('Decision not reached');}
test('public eventId is projected without private fields, snapshot writes, RNG draws or migration on reload',async()=>{
 let writes=0;const options={events:[fixture()],microfeeds:false,sessionId:'public-id-session',commit:async()=>writes++};
 const session=await GameSession.create(424242,options);await reachDecision(session);
 const before=JSON.stringify(session.exportSnapshot()),writesBefore=writes;
 for(let i=0;i<100;i++){
  const d=session.getView().decision;assert.equal(d.eventId,'PUBLIC_ID_TEST');
  assert.deepEqual(Object.keys(d).sort(),['eventId','memories','instanceId','family','title','body','visible','uncertain','choices'].sort());
  assert.deepEqual(Object.keys(d.choices[0]).sort(),['id','label']);d.eventId='foreign';
 }
 assert.equal(JSON.stringify(session.exportSnapshot()),before);assert.equal(writes,writesBefore);
 const reloaded=await GameSession.migrateFromSave(before,options);
 assert.equal(reloaded.getView().decision.eventId,'PUBLIC_ID_TEST');assert.equal(JSON.stringify(reloaded.exportSnapshot()),before);assert.equal(writes,writesBefore);
});
test('ES/EN presentation submits the same choice and produces identical snapshots, results and RNG',async()=>{
 const options={events:[fixture()],microfeeds:false,sessionId:'locale-parity-session'};
 const es=await GameSession.create(424242,options),en=await GameSession.create(424242,options);
 await reachDecision(es);await reachDecision(en);
 for(const [session,locale] of [[es,'es'],[en,'en']]){
  const d=presentCareerDecision(session.getView().decision,locale).decision;
  await session.dispatch({type:'choose',commandId:'same-choice',expectedRevision:session.getView().revision,pendingInstanceId:d.instanceId,choiceId:d.choices[0].id});
 }
 assert.deepEqual(en.exportSnapshot(),es.exportSnapshot());assert.deepEqual(en.getView(),es.getView());
});
test('real scene text and focused choice switch language without reads/writes or changed choose payload',async()=>{
 const previous=globalThis.localStorage;globalThis.localStorage={getItem:()=>null,setItem(){}};
 const base=(await GameSession.create(424242,{events:[]})).getView();
 const v={...base,screen:'decision',revision:7,cutscene:null,decision:publicDecision(),result:null,offer:null};
 const before=JSON.stringify(v),calls={reads:0,writes:0,commands:[]},root=makeGameRoot();
 const i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale:'en'});
 const session={getView:()=>v,dispatch:async command=>calls.commands.push(command)};
 const dispose=mountGame({root,GameSession:{migrateFromSave:async()=>session},saveStore:{read:async()=>{calls.reads++;return 'saved';},legacyChanged:async()=>false,hasPrevious:()=>false,write:async()=>calls.writes++,close:async()=>{}},assets:{},css:'',compactHome:false,initialView:'home',autoCreateOnLoad:false,deferAutoResume:true,presentationLocale:i18n});
 try{
  await tick();assert.match(text(root),/The 26-player list/);assert.match(text(root),/There is no promise that you will stay/);
  all(root).find(node=>node.dataset.localeFocus==='choice-CALL_RIVAS').focus();i18n.setLocale('es');
  assert.match(text(root),/La lista de 26/);assert.equal(root.ownerDocument.activeElement.dataset.localeFocus,'choice-CALL_RIVAS');
  i18n.setLocale('en');root.ownerDocument.activeElement.click();await tick();
  const {commandId,...payload}=calls.commands[0];assert.deepEqual(payload,{type:'choose',expectedRevision:7,pendingInstanceId:'pending-1',choiceId:'CALL_RIVAS'});
  assert.equal(calls.commands.length,1);assert.equal(calls.reads,1);assert.equal(calls.writes,0);assert.equal(JSON.stringify(v),before);
 }finally{dispose();globalThis.localStorage=previous;}
});
