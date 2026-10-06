import {newDailyRun,applyDailyCommand,dailyScore} from '../../reddit/server/daily-run.mjs';
import {legacyDailyScore} from '../../reddit/server/daily-score.mjs';
import {dailyConfig} from '../../reddit/server/daily-service.mjs';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const policies=[
 {name:'primera',club:'first',slots:[0,0,0,0]},
 {name:'segunda',club:'first',slots:[1,1,1,1]},
 {name:'tercera',club:'first',slots:[2,2,2,2]},
 {name:'atributos_club_modesto',club:'low',slots:[1,1,1,0]},
 {name:'atributos_club_prestigioso',club:'high',slots:[1,1,1,0]},
 {name:'forzar_club_modesto',club:'low',slots:[1,1,2,1]},
];
const n=Number(process.env.STUDY_DAYS||10),rows=[];const start=performance.now();
for(let day=0;day<n;day++){
 const config={...dailyConfig(new Date(Date.UTC(2026,9,1+day))),rulesVersion:4};
 // Same v3 seeds across all ten days isolates the scoring change from seed rotation.
 const id=`daily-v3:${config.day}`;config.seed=2166136261;for(const char of id)config.seed=Math.imul(config.seed^char.charCodeAt(0),16777619)>>>0;
 for(const policy of policies){
  const run=newDailyRun(config);
  while(!run.finished){
   const cmd={commandId:`study-${run.revision}`,expectedRevision:run.revision};
   if(run.summaryPending)cmd.type='acknowledge';
   else {cmd.type='choose';if(run.pending.kind==='club'){
     const clubs=run.pending.clubs;let club=clubs[0];
     if(policy.club==='low')club=[...clubs].sort((a,b)=>a.prestige-b.prestige)[0];
     if(policy.club==='high')club=[...clubs].sort((a,b)=>b.prestige-a.prestige)[0];
     cmd.choiceId=club.id;
    }else{const choices=run.pending.choices;cmd.choiceId=choices[Math.min(choices.length-1,policy.slots[run.resolved%5-1])].id;}}
   applyDailyCommand(run,cmd);
  }
  const score=dailyScore(run.state,run);const sums=k=>run.seasons.reduce((s,x)=>s+(x[k]||0),0);
  rows.push({day:config.day,seed:config.seed,policy:policy.name,score:score.total,legacyScore:legacyDailyScore(run.state).total,parts:score.breakdown,values:score.breakdown.map(x=>x.value),played:sums('played'),goals:sums('goals'),assists:sums('assists'),titles:run.summaries.flatMap(s=>s.titles).length,awards:run.summaries.flatMap(s=>s.awards).length,original:run.history.filter(x=>x.original).length,fatigue:run.state.body.fatigue,risk:run.state.body.risk});
 }
 console.log('Completed day',day+1,'/',n,'in',Math.round((performance.now()-start)/1000),'s');
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const summaries=policies.map(p=>{const a=rows.filter(r=>r.policy===p.name),scores=a.map(r=>r.score);return {policy:p.name,n:a.length,mean:mean(scores),legacyMean:mean(a.map(r=>r.legacyScore)),min:Math.min(...scores),max:Math.max(...scores),sd:Math.sqrt(mean(scores.map(x=>(x-mean(scores))**2))),values:a[0].values,originalMean:mean(a.map(x=>x.original)),goalsMean:mean(a.map(x=>x.goals)),titlesMean:mean(a.map(x=>x.titles)),fatigueMean:mean(a.map(x=>x.fatigue)),riskMean:mean(a.map(x=>x.risk))};});
const result={head:'91b6449b6e9dc4226f0b36b35384bc3558a425dc',days:n,runs:rows.length,ms:performance.now()-start,summaries,rows};
writeFileSync(new URL('./scoring-v2-comparison.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(summaries,null,2));
