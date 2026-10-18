import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {newDailyRun,applyDailyCommand,dailyScore,DAILY_POSITIONS} from '../reddit/server/daily-run.mjs';
import {FOOTBALL_CLUBS,clubsForDivision,divisionById} from '../dist/catalog/football/index.js';
import {scoreFacts,fitScoreReferences,DEFAULT_SCORE_PARAMETERS,calibratedDailyScore} from '../reddit/shared/daily-score-candidate.mjs';
import {pick as originalPick} from '../docs/qa/intensivo-2026-10-05/daily-points-study.mjs';
const dir='docs/qa/calibracion-daily-2026-10-06';fs.mkdirSync(dir,{recursive:true});
const trainSeeds=[1,907,29,71,424242],validationSeeds=[104729,8675309,20261006],policies=['first','middle','last','health','ambitious','balanced','promises','technical','contender','lower-leagues'];
const clubs=new Map(FOOTBALL_CLUBS.map(c=>[c.id,c]));
function pick(run,policy){if(!['contender','lower-leagues'].includes(policy))return originalPick(run,policy);const p=run.pending,s=run.state;
 if(p.kind==='club'){const quality=c=>{const club=clubs.get(c.id),pool=clubsForDivision(club.divisionId),rank=pool.filter(other=>other.prestige<=club.prestige).length/pool.length,credit=Math.min(1,c.role/65);return rank*.65+credit*.35+(policy==='contender'?divisionById(club.divisionId).strength/100*.25:(club.tier-1)*.25);};return [...p.clubs].sort((a,b)=>quality(b)-quality(a))[0].id;}
 const slot=run.resolved%5-1,arc=[s.sport.roleScore<55?'team':'learn','football',s.body.risk>35||s.body.fatigue>35?'recover':'plan',s.personality.professionalism<70?'mentor':'work'][slot];return p.event.choices.find(c=>c.arc===arc).id;}
const path=`${dir}/cohort.json`,rows=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)).rows:[],start=Date.now();
for(const seed of [...trainSeeds,...validationSeeds])for(const position of DAILY_POSITIONS)for(const policy of policies){if(rows.some(r=>r.seed===seed&&r.position===position&&r.policy===policy))continue;
 const run=newDailyRun({seed,rulesVersion:7});run.state.sport.positionIdentity=position;let steps=0;
 while(!run.finished)applyDailyCommand(run,{commandId:`calibrate-${steps++}`,expectedRevision:run.revision,type:run.summaryPending?'acknowledge':'choose',choiceId:run.summaryPending?undefined:pick(run,policy)});
 const facts=scoreFacts(run);rows.push({seed,position,policy,split:trainSeeds.includes(seed)?'train':'validation',current:dailyScore(run.state,run).total,facts});
 fs.writeFileSync(path,JSON.stringify({trainSeeds,validationSeeds,policies,scope:'Forced-position controlled research; game simulation and saved attempts unchanged',rows}));if(rows.length%35===0)console.log(JSON.stringify({careers:rows.length,of:(trainSeeds.length+validationSeeds.length)*DAILY_POSITIONS.length*policies.length,elapsedMs:Date.now()-start}));
}
const train=rows.filter(r=>r.split==='train'),validation=rows.filter(r=>r.split==='validation'),references=fitScoreReferences(train),parameters={...DEFAULT_SCORE_PARAMETERS};
// Training p90 provides a scale signal, but never saturate the title block after one continental championship.
const provisional={version:1,id:'training-provisional',parameters,references};
const units=train.map(r=>calibratedDailyScore(r.facts,provisional).titleUnits).filter(n=>n>0).sort((a,b)=>a-b);
parameters.titleTarget=Math.max(100,Math.min(200,Math.round(units[Math.floor((units.length-1)*.9)])));
const producerFiles=['reddit/server/daily-run.mjs','reddit/shared/league-simulator.mjs','reddit/shared/position-rating.mjs','dist/simulation/match-model.js','dist/catalog/football/world.js'];
const producerFingerprint=createHash('sha256').update(producerFiles.map(f=>fs.readFileSync(f,'utf8')).join('\n')).digest('hex');
const scoreImplementationFingerprint=createHash('sha256').update(fs.readFileSync('reddit/shared/daily-score-candidate.mjs')).digest('hex');
const config={version:1,id:'daily-achievements-2026-10-06',status:'candidate-not-activated',producerVersion:7,producerFingerprint,scoreImplementationFingerprint,trainSeeds,validationSeeds,parameters,references};config.sha256=createHash('sha256').update(JSON.stringify(config)).digest('hex');fs.writeFileSync('reddit/shared/daily-score-calibration.json',JSON.stringify(config,null,2)+'\n');
const result=rows.map(r=>({seed:r.seed,position:r.position,policy:r.policy,split:r.split,current:r.current,score:calibratedDailyScore(r.facts,config)}));
const mean=(rows,f)=>rows.reduce((n,r)=>n+f(r),0)/rows.length;
function summary(group){const byPosition=Object.fromEntries(DAILY_POSITIONS.map(p=>[p,mean(group.filter(r=>r.position===p),r=>r.score.total)])),byPolicy=Object.fromEntries(policies.map(p=>[p,mean(group.filter(r=>r.policy===p),r=>r.score.total)]));
 const winners={};for(const seed of [...new Set(group.map(r=>r.seed))])for(const position of DAILY_POSITIONS){const cases=group.filter(r=>r.seed===seed&&r.position===position),best=Math.max(...cases.map(r=>r.score.total));for(const r of cases.filter(r=>r.score.total===best))winners[r.policy]=(winners[r.policy]??0)+1;}
 const equalPalmaresGaps=[];for(const seed of [...new Set(group.map(r=>r.seed))])for(const policy of policies){const cases=group.filter(r=>r.seed===seed&&r.policy===policy),bins=new Map();for(const r of cases){const key=JSON.stringify(r.score.titleEvents.map(e=>[e.id,e.base,Math.round(e.contribution*100)/100]));const bin=bins.get(key)??[];bin.push(r.score);bins.set(key,bin);}for(const scores of bins.values())if(scores.length>=2)equalPalmaresGaps.push(Math.max(...scores.map(s=>s.total))-Math.min(...scores.map(s=>s.total)));}
 return {count:group.length,min:Math.min(...group.map(r=>r.score.total)),max:Math.max(...group.map(r=>r.score.total)),mean:mean(group,r=>r.score.total),byPosition,byPolicy,winners,zeroTitleCareers:group.filter(r=>!r.score.titleUnits).length,meanTitlePoints:mean(group,r=>r.score.exact.titles),maxEqualPalmaresGap:Math.max(0,...equalPalmaresGaps)};
}
fs.writeFileSync(`${dir}/results.json`,JSON.stringify(result,null,2));const report={configuration:config.id,parameters,train:summary(result.filter(r=>r.split==='train')),validation:summary(result.filter(r=>r.split==='validation')),elapsedMs:Date.now()-start};fs.writeFileSync(`${dir}/summary.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
