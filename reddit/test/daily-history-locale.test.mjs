import test from 'node:test';
import assert from 'node:assert/strict';
import {publicDailyHistory} from '../server/daily-presentation.mjs';
import {eligibleDailyStories} from '../server/daily-story-policy.mjs';
import {translateDailyHistory,translateDailyResult,translateDailyPlayer,MissingDailyTranslation} from '../client/daily-story-locale.mjs';
import en from '../i18n/en.json' with {type:'json'};
function oldRun(){
 const history=[],records=[];
 for(let index=0;index<30;index++){
  const stage=Math.floor(index/5),slot=index%5-1,age=18+stage*3,club=stage<2?'A':'B';
  history.push({age,title:'Título ES',choice:'Texto ES',original:false});
  if(slot>=0)records.push({eventId:`DAILY_${stage}_${slot}`,choiceId:'c1',outcomeId:'o1',club,snapshot:{age}});
 }
 return {resolved:30,history,state:{club:'B',history:records}};
}
const clubName=id=>({A:'Club A',B:'Club B'})[id];
test('old Daily history gets 24 story IDs and six club results without save changes',()=>{
 const run=oldRun(),before=JSON.stringify(run),history=publicDailyHistory(run,clubName);
 assert.equal(history.length,30);assert.equal(JSON.stringify(run),before);
 assert.equal(history[0].presentation.kind,'club');assert.equal(history[0].presentation.stay,false);assert.equal(history[5].presentation.stay,true);assert.equal(history[10].presentation.stay,false);
 for(const [index,entry]of history.entries())if(index%5)assert.equal(entry.presentation.eventId,`DAILY_${Math.floor(index/5)}_${index%5-1}`);
 const translated=translateDailyHistory(history,'en');assert.equal(translated[0].title,'Choose club');assert.equal(translated[0].choice,'A new chapter at Club A.');assert.equal(translated[5].choice,'You stay at Club A.');assert.equal(translated[1].title,en.fallbackEvents.DAILY_0_0.title);assert.equal(translated[1].choice,en.fallbackChoices['0:c1']);
 assert.equal(translateDailyHistory(history,'es'),history);assert.equal(JSON.stringify(run),before);
});
test('read-only projection handles the latest club before any new narrative record',()=>{
 const run=oldRun();run.history=run.history.slice(0,6);run.state.history=run.state.history.slice(0,4);run.resolved=6;run.state.club='B';
 const before=JSON.stringify(run),last=publicDailyHistory(run,clubName).at(-1);
 assert.deepEqual(last.presentation,{kind:'club',club:'Club B',stay:false});assert.equal(JSON.stringify(run),before);
});
test('inconsistent counts, ages or reordered fallback records cannot guess history metadata',()=>{
 for(const mutate of [run=>run.state.history.pop(),run=>run.resolved--,run=>run.state.history[0].snapshot.age++,run=>{[run.state.history[0],run.state.history[1]]=[run.state.history[1],run.state.history[0]];}]){
  const run=oldRun();mutate(run);const before=JSON.stringify(run),history=publicDailyHistory(run,clubName);
  assert.ok(history.every(entry=>entry.presentation===null));assert.equal(JSON.stringify(run),before);assert.throws(()=>translateDailyHistory(history,'en'),MissingDailyTranslation);assert.equal(translateDailyHistory(history,'es'),history);
 }
});
test('all 72 fallback outcomes translate from recorded choice/outcome IDs',()=>{
 for(let stage=0;stage<6;stage++)for(let slot=0;slot<4;slot++)for(let choice=0;choice<3;choice++){
  const meta={kind:'story',eventId:`DAILY_${stage}_${slot}`,choiceId:`c${choice}`,outcomeId:`o${choice}`};
  const text=translateDailyResult('Resultado original ES',meta,'en');assert.ok(text.startsWith(en.fallbackChoices[`${slot}:c${choice}`]));assert.ok(text.endsWith('Your decision shapes the next part of your season.'));assert.equal(translateDailyResult('Resultado original ES',meta,'es'),'Resultado original ES');
 }
 assert.equal(translateDailyResult('',null,'en'),'');
 assert.throws(()=>translateDailyResult('Texto ES',{kind:'story',eventId:'DAILY_0_0',choiceId:'c0',outcomeId:'o2'},'en'),MissingDailyTranslation);
 assert.throws(()=>translateDailyResult('Texto ES',{kind:'story',eventId:'EVT_REAL',choiceId:'c0',outcomeId:'o0'},'en'),MissingDailyTranslation);
 assert.throws(()=>translateDailyResult('Texto ES',null,'en'),MissingDailyTranslation);
});
test('Daily safety policy retains numeric stories and rejects career protocol changes',()=>{
 const event={family:'family',text:{body:'Una escena'},choices:[{id:'a'},{id:'b'}],outcomes:[{effects:[{kind:'numeric',path:'body.fitness',delta:1}]}]};
 assert.deepEqual(eligibleDailyStories([event]),[event]);
 const changed=[{...event,seedsRead:['SEED']},{...event,seedsWrite:['SEED']},{...event,outcomes:[{effects:[{kind:'flag',path:'flags.TEST'}]}]},{...event,outcomes:[{effects:[{kind:'numeric',path:'contract.monthsRemaining'}]}]},{...event,choices:[{id:'a',hiddenCosts:[{kind:'numeric',path:'professional.ownerClub'}]},{id:'b'}]}];
 assert.deepEqual(eligibleDailyStories(changed),[]);
});

test('unsigned-player display translates by public status and preserves real club names',()=>{
 const view={club:'Sin equipo',clubStatus:'unsigned',revision:3};const before=JSON.stringify(view);assert.equal(translateDailyPlayer(view,'en').club,'Without a club');assert.equal(translateDailyPlayer(view,'es'),view);assert.equal(JSON.stringify(view),before);
 const signed={club:'Club A',clubStatus:'signed'};assert.equal(translateDailyPlayer(signed,'en'),signed);assert.throws(()=>translateDailyPlayer({club:'Unknown'},'en'),MissingDailyTranslation);
});
