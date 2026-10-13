import {FOOTBALL_CLUBS,divisionById} from '../../dist/catalog/football/index.js';
import {createLeagueSeason,leagueStandings,advanceLeagueSeason,advanceContinentalPlayer,continentalScore,playerFact,publicContinentalSeason,leagueHash} from './league-simulator.mjs';
const stages=[['Octavos',1,9],['Cuartos',2,9],['Semifinal',3,13],['Final',4,25]];
const compare=(a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id.localeCompare(b.id);
const scheduled=(year,month,day,weekday=2)=>{const date=new Date(Date.UTC(year,month,day));date.setUTCDate(date.getUTCDate()+(weekday-date.getUTCDay()+7)%7);return date.toISOString().slice(0,10);};

const qualificationSlots={ESP:4,ENG:4,ITA:4,DEU:4,FRA:4,PRT:4,NLD:2,BEL:2,TUR:2,NOR:2};
const previousCache=new Map();
export function createLiveContinentalSeason({seed,year,clubId,previousLeague}){
 const previousDivision=previousLeague?divisionById(previousLeague.divisionId):null,entrants=[];
 for(const [country,slots]of Object.entries(qualificationSlots)){
  let league;
  if(previousLeague?.closed&&previousDivision?.tier===1&&previousDivision.countryCode===country)league=previousLeague;
  else {
   const key=`${seed}:${year}:${country}`;league=previousCache.get(key);
   if(!league){const club=FOOTBALL_CLUBS.find(c=>c.countryCode===country&&c.tier===1);league=createLeagueSeason({seed,year:year-1,clubId:club.id,tier:1,route:country==='ESP'?'domestic':'abroad'});advanceLeagueSeason(league,`${year}-06-30`,{seed});previousCache.set(key,league);if(previousCache.size>120)previousCache.delete(previousCache.keys().next().value);}
  }
  entrants.push(...leagueStandings(league).slice(0,slots));
 }
 entrants.sort((a,b)=>leagueHash(`${seed}:${year}:live-draw:${a.id}`)-leagueHash(`${seed}:${year}:live-draw:${b.id}`)||a.id.localeCompare(b.id));
 const teams=entrants.map(t=>({id:t.id,name:t.name,strength:t.strength,form:0,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0})),groups=[],matches=[];
 const pairs=[[[0,3],[1,2]],[[0,2],[3,1]],[[0,1],[2,3]],[[3,0],[2,1]],[[2,0],[1,3]],[[1,0],[3,2]]];
 for(let g=0;g<8;g++){const ids=[g*4,g*4+1,g*4+2,g*4+3];groups.push(ids);for(let round=0;round<6;round++)for(const [a,b]of pairs[round]){const date=scheduled(year,8,8+round*14);matches.push({round:round+1,date,home:ids[a],away:ids[b],hg:null,ag:null,stage:`Grupo ${String.fromCharCode(65+g)}`,group:g});}}
 return {id:`${year}-${String(year+1).slice(-2)}`,year,clubId,teams,groups,matches,winner:null,qualified:teams.some(t=>t.id===clubId),liveVersion:1,nextStage:0,closed:false};
}
function generateNextStage(cup,active){
 const [stage,month,day]=stages[cup.nextStage++];
 for(let i=0;i<active.length;i+=2){
  const home=active[i],away=active[i+1],tie=`${stage}:${home}:${away}`,round=7+cup.matches.length;
  cup.matches.push({round,date:scheduled(cup.year+1,month,day,stage==='Final'?6:2),home,away,hg:null,ag:null,stage,tie,leg:1});
  if(stage!=='Final')cup.matches.push({round:round+1,date:scheduled(cup.year+1,month,day+14),home:away,away:home,hg:null,ag:null,stage,tie,leg:2});
 }
}
function resolveTies(cup,seed,phase){
 const winners=[];
 for(const tie of new Set(phase.map(m=>m.tie))){
  const matches=phase.filter(m=>m.tie===tie),first=matches[0],last=matches.at(-1);
  const homeGoals=first.hg+(matches[1]?.ag??0),awayGoals=first.ag+(matches[1]?.hg??0);
  let winner=homeGoals>awayGoals?first.home:first.away;
  if(homeGoals===awayGoals){winner=(leagueHash(`${seed}:live-pens:${cup.year}:${tie}`)%2)?first.home:first.away;last.penalties=winner===last.home?{home:5,away:4}:{home:4,away:5};}
  last.winner=winner;winners.push(winner);
 }
 return winners;
}
export function advanceLiveContinentalSeason(league,cup,toDate,options){
 const {seed,playerState}=options;
 while(!cup.closed){
  const phase=cup.nextStage===0?cup.matches.filter(m=>m.group!==undefined):cup.matches.filter(m=>m.stage===stages[cup.nextStage-1][0]);
  const dates=[...new Set(phase.filter(m=>m.hg===null&&m.date<=toDate).map(m=>m.date))].sort();
  for(const date of dates){
   // League and cup evolve in chronological order. No future performance is read.
   advanceLeagueSeason(league,date,options);
   playerState.date=date;playerState.age=18+Number(date.slice(0,4))-2026-(date.slice(5)<'07-01'?1:0);
   for(const match of phase.filter(m=>m.date===date&&m.hg===null)){
    const ours=cup.teams[match.home].id===league.clubId||cup.teams[match.away].id===league.clubId;
    const fact=ours?playerFact(playerState,{id:league.id+':cup'},match,seed):null;
    const boost=fact?.appeared?Math.max(-3,Math.min(7,(playerState.professional.technique*.35+playerState.sport.form*.3+playerState.sport.roleScore*.2+playerState.professional.composure*.15-50)/8)):0;
    continentalScore(cup,match,seed,match.group!==undefined,boost);
   }
   advanceContinentalPlayer(league,cup,date,options);
  }
  if(phase.some(m=>m.hg===null))break;
  let active;
  if(cup.nextStage===0){const rankings=cup.groups.map(ids=>[...ids].sort((a,b)=>compare(cup.teams[a],cup.teams[b])));active=rankings.flatMap((ids,i)=>[ids[0],rankings[7-i][1]]);}
  else active=resolveTies(cup,seed,phase);
  if(active.length===1){cup.winner=active[0];cup.closed=true;break;}
  generateNextStage(cup,active);
 }
 return cup;
}
export function publicLiveContinentalSeason(cup,date){
 if(!cup)return null;
 // Project played results only; future fixtures never reveal scores or winners.
 const played={...cup,matches:cup.matches.filter(m=>m.hg!==null&&m.date<=date)};
 const result=publicContinentalSeason({...played,winner:cup.closed?cup.winner:null},date);
 result.winner=cup.closed&&cup.matches.at(-1).date<=date?cup.teams[cup.winner].name:null;
 result.champion=Boolean(result.winner&&cup.qualified&&cup.teams[cup.winner].id===cup.clubId);
 result.matches=cup.matches.map(m=>m.date<=date&&m.hg!==null?{...m}:{round:m.round,date:m.date,home:m.home,away:m.away,hg:null,ag:null,stage:m.stage});
 result.format='Formato adaptado: grupos y eliminatorias decididos partido a partido';
 return result;
}
