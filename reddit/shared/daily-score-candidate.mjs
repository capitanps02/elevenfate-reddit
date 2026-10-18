// Candidate scoring only. Existing Daily versions never import or call this module.
import {FOOTBALL_CLUBS,divisionById} from '../../dist/catalog/football/index.js';
import {leagueStandings} from './league-simulator.mjs';
const clubs=new Map(FOOTBALL_CLUBS.map(c=>[c.id,c]));
export const SCORE_POSITIONS=['goalkeeper','centre_back','full_back','defensive_midfielder','central_midfielder','winger','striker'];
const clamp=n=>Math.max(0,Math.min(1,n));
const average=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:0;
const phase=year=>year<2028?0:year<2031?1:year<2034?2:year<2038?3:year<2042?4:5;
const finite=n=>{if(!Number.isFinite(n)||n<0)throw Error('Invalid score facts');return n;};
export function scoreFacts(run){
 if(run.version!==7||!run.finished||run.resolved!==30||!SCORE_POSITIONS.includes(run.state.sport.positionIdentity))throw Error('Scoring requires a completed compatible career');
 if(run.seasons.length!==20||new Set(run.seasons.map(s=>s.season)).size!==20||run.cups.length!==20||run.cups.some(c=>!c.closed)||new Set(run.cups.map(c=>c.year)).size!==20)throw Error('Incomplete score history');
 const ids=new Set();
 const seasons=run.competitions.map(league=>{
  if(!league.closed||ids.has(league.id))throw Error('Incomplete or duplicate season');ids.add(league.id);
  const row=run.seasons.find(s=>s.season===league.id),club=clubs.get(league.clubId),division=divisionById(league.divisionId);
  if(!row||!club||!division)throw Error('Unknown score season');
  function facts(records=[]){let minutes=0,ratingMinutes=0,played=0,starts=0,injured=0;const dates=new Set();
   for(const m of records){if(dates.has(m.date))throw Error('Duplicate score match');dates.add(m.date);finite(m.player.minutes);if(m.player.minutes>90)throw Error('Invalid score minutes');
    if(m.player.appeared){if(!Number.isFinite(m.stats.rating)||m.stats.rating<3.5||m.stats.rating>10||!m.player.minutes)throw Error('Invalid score rating');played++;starts+=Number(m.player.started);minutes+=m.player.minutes;ratingMinutes+=m.stats.rating*m.player.minutes;}
    else if(m.player.minutes)throw Error('Absent player has minutes');injured+=Number(!!m.player.injuryUnavailable);
   }return {available:records.length,minutes,ratingMinutes,played,starts,injured};}
  const leagueFacts=facts(league.player.matches),cupFacts=facts(league.cupPlayer?.matches),all=Object.fromEntries(Object.keys(leagueFacts).map(k=>[k,leagueFacts[k]+cupFacts[k]]));
  const cup=run.cups.find(c=>c.year===league.year),titles=[];
  if(leagueStandings(league)[0]?.id===league.clubId)titles.push('Campeón de liga');
  if(cup?.qualified&&cup.teams[cup.winner]?.id===league.clubId)titles.push('Champions · formato adaptado');
  return {id:league.id,stage:phase(league.year),tier:club.tier,strength:division.strength/100,...all,league:leagueFacts,cup:cupFacts,titles:titles.sort(),club:club.name};
 });
 if(seasons.length!==20||seasons.some(s=>s.stage<0||s.stage>5))throw Error('Expected twenty complete seasons');
 return {position:run.state.sport.positionIdentity,seasons};
}
export function fitScoreReferences(careers){
 const references={};
 for(const position of SCORE_POSITIONS)for(let stage=0;stage<6;stage++){
  const rows=careers.filter(c=>c.position===position).flatMap(c=>c.facts.seasons.filter(s=>s.stage===stage&&s.minutes>=900)),values=rows.map(s=>s.ratingMinutes/s.minutes);
  if(values.length<20)throw Error('Insufficient calibration coverage');
  const centre=average(values),strengthCentre=average(rows.map(s=>s.strength)),variance=average(rows.map(s=>(s.strength-strengthCentre)**2));
  const covariance=average(rows.map((s,i)=>(s.strength-strengthCentre)*(values[i]-centre)));
  const strengthSlope=variance>1e-6?Math.max(-2,Math.min(2,covariance/variance)):0;
  const deviation=Math.max(.12,Math.sqrt(average(rows.map((s,i)=>(values[i]-centre-strengthSlope*(s.strength-strengthCentre))**2))));
  references[`${position}:${stage}`]={centre,strengthCentre,strengthSlope,deviation,count:values.length};
 }
 return references;
}
export const DEFAULT_SCORE_PARAMETERS=Object.freeze({titleTarget:100,titleCurve:8,individualTarget:20,participationTarget:.65,titleParticipation:.5,minimumLeagueMinutes:450,minimumCupMinutes:180,qualityShrinkMinutes:450,qualityExposureMinutes:900,outstandingGrade:.75,exceptionalGrade:.9});
export function calibratedDailyScore(facts,config){
 if(config.version!==1||!SCORE_POSITIONS.includes(facts.position))throw Error('Unknown scoring configuration');
 if(facts.seasons.length!==20||new Set(facts.seasons.map(s=>s.id)).size!==20)throw Error('Incomplete score facts');
 const params=config.parameters,refs=config.references;
 for(const key of Object.keys(DEFAULT_SCORE_PARAMETERS))if(!Number.isFinite(params[key])||params[key]<=0)throw Error('Invalid score parameters');
 const stages=Array.from({length:6},()=>[]),titleEvents=[],individualEvents=[],milestones=[],repeats={};let titleUnits=0,individualUnits=0;
 for(const s of [...facts.seasons].sort((a,b)=>a.id.localeCompare(b.id))){
  if(!Number.isInteger(s.stage)||s.stage<0||s.stage>5||!Number.isInteger(s.tier)||s.tier<1||s.tier>3||!Number.isFinite(s.strength)||s.strength<0||s.strength>1)throw Error('Invalid season context');
  for(const f of [s,s.league,s.cup])for(const key of ['available','minutes','ratingMinutes','played','starts','injured'])finite(f[key]);
  for(const f of [s,s.league,s.cup])if(!Number.isInteger(f.available)||!Number.isInteger(f.played)||!Number.isInteger(f.starts)||!Number.isInteger(f.injured)||f.played>f.available||f.starts>f.played||f.injured>f.available||f.minutes>f.available*90||f.ratingMinutes<f.minutes*3.5||f.ratingMinutes>f.minutes*10)throw Error('Contradictory score facts');
  if(new Set(s.titles).size!==s.titles.length||s.titles.some(t=>!['Campeón de liga','Champions · formato adaptado'].includes(t)))throw Error('Invalid title ledger');
  const ref=refs[`${facts.position}:${s.stage}`];if(!ref||!Number.isFinite(ref.centre)||!Number.isFinite(ref.deviation)||!(ref.deviation>0))throw Error('Missing score reference');
  const exposure=s.available?clamp(s.minutes/(90*s.available)):0;
  const expected=ref.centre+(ref.strengthSlope??0)*(s.strength-(ref.strengthCentre??s.strength));
  const z=s.minutes?(s.ratingMinutes/s.minutes-expected)/ref.deviation:0;
  const grade=s.minutes?Math.round(clamp(.5+z/4)*1e6)/1e6:0;
  const quality=s.minutes?clamp(.5+z/4*s.minutes/(s.minutes+params.qualityShrinkMinutes))*Math.min(1,s.minutes/params.qualityExposureMinutes):0;
  stages[s.stage].push({quality,participation:clamp(exposure/params.participationTarget),difficulty:s.strength*clamp(exposure/.5),continuity:s.available?1-s.injured/s.available:0});
  for(const title of s.titles){const continental=title.startsWith('Champions'),f=continental?s.cup:s.league,minimum=continental?params.minimumCupMinutes:params.minimumLeagueMinutes;
   if(f.minutes<minimum||!f.available)continue;
   const category=continental?'continental':`league:${s.tier}`,repeat=repeats[category]??0;repeats[category]=repeat+1;
   const contribution=clamp(f.minutes/(f.available*90*params.titleParticipation)),base=continental?35:(s.tier===1?20:s.tier===2?6:2)*s.strength;
   const units=base*contribution*Math.max(.5,1-.15*repeat);titleUnits+=units;titleEvents.push({id:`${s.id}:${category}`,season:s.id,title,base,contribution,repeat,units,minutes:f.minutes});
  }
  // One position-calibrated performance achievement per season. Existing attacker-only awards are not scored.
  if(s.played>=20&&s.minutes>=1200&&grade>=params.outstandingGrade){const exceptional=grade>=params.exceptionalGrade,base=(exceptional?8:5)*s.strength,units=base*Math.max(.5,1-.1*individualEvents.length);individualUnits+=units;individualEvents.push({id:`${s.id}:performance`,season:s.id,title:exceptional?'Temporada excepcional en tu posición':'Temporada sobresaliente en tu posición',grade,minutes:s.minutes,units});}
 }
 const played=facts.seasons.reduce((n,s)=>n+s.played,0),starts=facts.seasons.reduce((n,s)=>n+s.starts,0);
 if(played)milestones.push({id:'debut',title:'Debut oficial',points:5});
 if(starts>=5)milestones.push({id:'five-starts',title:'Cinco titularidades',points:5});
 if(facts.seasons.some(s=>s.played>=20&&s.minutes>=1500))milestones.push({id:'regular-season',title:'Temporada de participación regular',points:5});
 if(facts.seasons.some(s=>s.cup.minutes>=15))milestones.push({id:'continental-debut',title:'Participación continental',points:5});
 if(facts.seasons.filter(s=>s.minutes>=450).length>=10)milestones.push({id:'ten-seasons',title:'Diez temporadas con aportación',points:5});
 const curve=(units,target,k)=>Math.min(1,Math.log1p(units/k)/Math.log1p(target/k));
 const block=key=>average(stages.map(rows=>average(rows.map(r=>r[key]))));
 const exact={titles:350*curve(titleUnits,params.titleTarget,params.titleCurve),individual:125*curve(individualUnits,params.individualTarget,4),milestones:milestones.reduce((n,e)=>n+e.points,0),performance:200*block('quality'),difficulty:150*block('difficulty'),participation:100*block('participation'),continuity:50*block('continuity')};
 const total=Math.round(Object.values(exact).reduce((n,v)=>n+v,0));
 const definitions=[['titles','Títulos colectivos',350],['individual','Temporadas sobresalientes',125],['milestones','Hitos deportivos',25],['performance','Rendimiento individual',200],['difficulty','Exigencia competitiva',150],['participation','Participación deportiva',100],['continuity','Continuidad física',50]];
 const breakdown=definitions.map(([key,label,max])=>({label,weight:max/10,value:exact[key]/max*100,points:Math.floor(exact[key])}));
 const order=definitions.map(([key],index)=>({index,remainder:exact[key]-Math.floor(exact[key])})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
 const unallocated=total-breakdown.reduce((n,p)=>n+p.points,0);for(let i=0;i<unallocated;i++)breakdown[order[i].index].points++;
 return {version:config.version,calibrationId:config.id,total,breakdown,exact,achievementPoints:exact.titles+exact.individual+exact.milestones,titleUnits,individualUnits,titleEvents,individualEvents,milestones};
}
