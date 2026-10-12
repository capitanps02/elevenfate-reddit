import test from 'node:test';
import assert from 'node:assert/strict';
import es from '../i18n/es.json' with {type:'json'};
import en from '../i18n/en.json' with {type:'json'};
import {translateDailyDecision,translateDailyStage,MissingDailyTranslation} from '../client/daily-story-locale.mjs';
import {publicDailyDecision,publicDailyStage} from '../server/daily-presentation.mjs';
const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};
test('all 24 fallback events and 72 displayed choices translate by IDs without mutating source',()=>{
 assert.deepEqual(Object.keys(es.fallbackEvents).sort(),Object.keys(en.fallbackEvents).sort());
 assert.deepEqual(Object.keys(es.fallbackChoices).sort(),Object.keys(en.fallbackChoices).sort());
 for(let stage=0;stage<6;stage++)for(let slot=0;slot<4;slot++){
  const eventId=`DAILY_${stage}_${slot}`;
  const decision=freeze({eventId,...es.fallbackEvents[eventId],original:false,choices:[0,1,2].map(i=>({id:`c${i}`,label:es.fallbackChoices[`${slot}:c${i}`],extra:'keep'}))});
  const snapshot=JSON.stringify(decision),translated=translateDailyDecision(decision,'en');
  assert.equal(translated.eventId,eventId);assert.equal(translated.title,en.fallbackEvents[eventId].title);assert.equal(translated.body,en.fallbackEvents[eventId].body);
  for(const [i,choice]of translated.choices.entries()){assert.equal(choice.id,decision.choices[i].id);assert.equal(choice.label,en.fallbackChoices[`${slot}:${choice.id}`]);assert.equal(choice.extra,'keep');}
  assert.equal(JSON.stringify(decision),snapshot);assert.equal(translateDailyDecision(decision,'es'),decision);
 }
});
test('missing IDs, canonical stories and uncovered choices fail explicitly in English',()=>{
 const valid={eventId:'DAILY_0_0',original:false,choices:[{id:'c0'}]};
 for(const decision of [{choices:[]},{...valid,eventId:'EVT_ORIGINAL'},{...valid,original:true},{...valid,eventId:'DAILY_6_0'},{...valid,choices:[{id:'unknown'}]}]){
  assert.throws(()=>translateDailyDecision(decision,'en'),MissingDailyTranslation);assert.equal(translateDailyDecision(decision,'es'),decision);
 }
 assert.throws(()=>translateDailyDecision(valid,'fr'),MissingDailyTranslation);
});
test('six stages use public stage IDs and retain ranges, stats and honours',()=>{
 for(let stageId=0;stageId<6;stageId++){
  const stage=freeze({stageId,name:es.stages[String(stageId)],from:18,to:20,played:42,titles:['unchanged']});
  const translated=translateDailyStage(stage,'en');assert.equal(translated.name,en.stages[String(stageId)]);assert.equal(translated.played,42);assert.equal(translated.titles,stage.titles);assert.equal(translated.stageId,stageId);assert.equal(translateDailyStage(stage,'es'),stage);
 }
 assert.throws(()=>translateDailyStage({name:'No ID'},'en'),MissingDailyTranslation);
 assert.throws(()=>translateDailyStage({stageId:9},'en'),MissingDailyTranslation);
});
test('public decision exposes event ID and eligible choices only, without touching persisted pending',()=>{
 const pending=freeze({kind:'story',event:{id:'EVT_REAL',text:{title:'Title',body:'Body'},seed:'private',choices:[{id:'locked'}],outcomes:[{id:'private-outcome'}]},choices:[{id:'eligible',label:'Label'}],original:true});
 const before=JSON.stringify(pending),view=publicDailyDecision(pending);
 assert.deepEqual(view,{eventId:'EVT_REAL',title:'Title',body:'Body',choices:[{id:'eligible',label:'Label'}],original:true});assert.equal(JSON.stringify(pending),before);
 view.choices[0].label='Changed externally';assert.equal(pending.choices[0].label,'Label');
 assert.equal(publicDailyDecision({kind:'club'}),null);assert.equal(publicDailyDecision(null),null);
});
test('public stage metadata stays outside stored state and supports old summaries',()=>{
 const old=freeze({from:18,to:20,name:'Primeros pasos',played:12});const snapshot=JSON.stringify(old);
 assert.deepEqual(publicDailyStage(old,0),{...old,stageId:0});assert.equal(JSON.stringify(old),snapshot);assert.equal(Object.hasOwn(old,'stageId'),false);assert.equal(publicDailyStage(undefined,0),undefined);
});
