import {FOOTBALL_CLUBS,clubsForDivision,clubById,divisionById} from '../../dist/catalog/football/index.js';
import {resolveFixtureDivision} from '../../dist/catalog/football/fixture-opponent.js';
export const leagueHash=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return (h^(h>>>16))>>>0;};
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const random=(seed,key)=>leagueHash(`${seed}:${key}`)/4294967296;
const iso=ms=>new Date(ms).toISOString().slice(0,10);
const weekday=(year,month,day,w=2)=>{const ms=Date.UTC(year,month,day);return ms+((w-new Date(ms).getUTCDay()+7)%7)*86400000;};
function poisson(seed,key,rate){let n=0,p=1;const stop=Math.exp(-rate);while(p>stop&&n<10){p*=Math.max(.000001,random(seed,`${key}:${n}`));n++;}return n-1;}
const names=['Álex','Dani','Iván','Marcos','Luis','Sergio','Óscar','Pablo','Lucas','Javi','Raúl','Diego'];
const surnames=['Soler','Vidal','Ramos','Costa','Molina','Ríos','Vega','Martín','Torres','León','Gil','Romero'];
export function createLeagueSeason({seed,year,clubId,tier,route='domestic',strengths={}}){
 const division=resolveFixtureDivision(clubId,tier,route,route==='abroad');
 if(!division)throw Error('No se encontró la división del equipo.');
 let clubs=[...clubsForDivision(division.id)];
 if(!clubs.some(c=>c.id===clubId)){const base=clubById(clubId);clubs[clubs.length-1]=base??{id:clubId,name:clubId==='UDV'?'U. D. Valdoria':clubId,prestige:40,financialPower:40,youthQuality:50};}
 clubs=clubs.sort((a,b)=>a.id.localeCompare(b.id));
 const teams=clubs.map(c=>({id:c.id,name:c.name,strength:clamp((strengths[c.id]??c.prestige)*.85+c.prestige*.15+(random(seed,`strength:${year}:${c.id}`)-.5)*14,25,95),form:(random(seed,`form:${year}:${c.id}`)-.5)*8,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
 const n=teams.length,rotation=Array.from({length:n},(_,i)=>i);if(n%2)rotation.push(-1);
 const legs=[];
 for(let r=0;r<rotation.length-1;r++){const pairs=[];for(let i=0;i<rotation.length/2;i++){let a=rotation[i],b=rotation[rotation.length-1-i];if(a<0||b<0)continue;if(i===0?r%2:i%2)[a,b]=[b,a];pairs.push([a,b]);}legs.push(pairs);rotation.splice(1,0,rotation.pop());}
 const rounds=[...legs,...legs.map(pairs=>pairs.map(([a,b])=>[b,a]))];
 const matches=[];const first=Date.UTC(year,7,1);const start=first+((6-new Date(first).getUTCDay()+7)%7)*86400000;for(const [round,pairs]of rounds.entries()){const date=iso(start+round*7*86400000);for(const [home,away]of pairs)matches.push({round:round+1,date,home,away,hg:null,ag:null});}
 const scorers=teams.flatMap((t,index)=>[0,1].map(slot=>({id:`${t.id}:${slot}`,club:t.id,name:`${names[leagueHash(t.id+slot)%names.length]} ${surnames[leagueHash(t.id+':'+slot)%surnames.length]}`,goals:0,played:0,ratingSum:0})));
 return {id:`${year}-${String(year+1).slice(-2)}`,year,division:division.name,divisionId:division.id,clubId,teams,matches,scorers,player:{played:0,starts:0,goals:0,assists:0,minutes:0,ratingSum:0,matches:[]},closed:false};
}
function addTeam(t,gf,ga){t.played++;t.gf+=gf;t.ga+=ga;if(gf>ga){t.won++;t.points+=3;t.form=clamp(t.form+1,-10,10);}else if(gf===ga){t.drawn++;t.points++;t.form*=.9;}else{t.lost++;t.form=clamp(t.form-1,-10,10);}}
function playerFact(state,season,match,seed){
 const key=`${season.id}:${match.round}`,injury=random(seed,key+':injury')<clamp(state.body.risk*.001+state.body.fatigue*.0007,0,.18),score=clamp(state.sport.roleScore*.4+state.sport.form*.2+state.body.fitness*.2+state.personality.professionalism*.2);
 const appeared=!injury&&random(seed,key+':appearance')<clamp(.12+state.sport.roleScore*.007+state.sport.form*.0015-state.body.fatigue*.001,0,.97);
 const started=appeared&&random(seed,key+':start')<clamp(.15+score*.007,0,.95),minutes=appeared?(started?Math.round(clamp(65+random(seed,key+':minutes')*25-state.body.fatigue*.08,45,90)):Math.round(12+random(seed,key+':minutes')*23)):0;
 return {calledUp:appeared||!injury,onBench:!started,started,appeared,minutes,debut:appeared&&state.sport.appearances===0,injuryUnavailable:injury};
}
export function advanceLeagueSeason(season,toDate,{seed,playerState,producePlayerStats}={}){
 for(const match of season.matches){if(match.hg!==null||match.date>toDate)continue;
  const home=season.teams[match.home],away=season.teams[match.away],ours=home.id===season.clubId||away.id===season.clubId;
  let fact=null,boost=0;
  if(ours&&playerState){playerState.date=match.date;playerState.age=18+Number(match.date.slice(0,4))-2026-(match.date.slice(5)<'07-01'?1:0);fact=playerFact(playerState,season,match,seed);boost=fact.appeared?clamp((playerState.professional.technique*.35+playerState.sport.form*.3+playerState.sport.roleScore*.2+playerState.professional.composure*.15-50)/8,-3,7):0;}
  const diff=home.strength+home.form-away.strength-away.form+(home.id===season.clubId?boost:away.id===season.clubId?-boost:0);
  const key=`match:${season.id}:${match.round}:${home.id}:${away.id}`;
  match.hg=poisson(seed,key+':h',clamp(1.45*Math.exp(diff/65),.3,3.8));match.ag=poisson(seed,key+':a',clamp(1.15*Math.exp(-diff/65),.25,3.5));
  addTeam(home,match.hg,match.ag);addTeam(away,match.ag,match.hg);
  let playerGoals=0;
  if(fact){const state=playerState,homeAway=home.id===season.clubId?'home':'away',opponent=homeAway==='home'?away:home,performance={age:state.age,careerRole:state.role,roleScore:state.sport.roleScore,form:clamp(state.sport.form*.7+state.professional.technique*.2+state.professional.composure*.1),fitness:state.body.fitness,fatigue:state.body.fatigue,coachTrust:clamp(state.personality.professionalism*.6+state.sport.roleScore*.4),leagueTier:state.professional.leagueTier,opponentLevel:opponent.strength,positionIdentity:state.sport.positionIdentity};
   const fixture={id:`daily:${season.id}:${match.round}:${season.clubId}`,date:match.date,season:season.id,competition:'league',club:season.clubId,opponent:opponent.name,opponentClubId:opponent.id,homeAway,official:true};
   const result={homeGoals:match.hg,awayGoals:match.ag,halfTimeHomeGoals:Math.floor(match.hg/2),halfTimeAwayGoals:Math.floor(match.ag/2),outcome:match.hg===match.ag?'draw':(homeAway==='home'?match.hg>match.ag:match.ag>match.hg)?'win':'loss'};
   const stats=producePlayerStats(state,fixture,fact,result,performance);playerGoals=stats.goals;
   if(fact.appeared){season.player.played++;season.player.starts+=Number(fact.started);season.player.goals+=stats.goals;season.player.assists+=stats.assists;season.player.minutes+=fact.minutes;season.player.ratingSum+=stats.rating??6;state.sport.appearances++;}
   season.player.matches.push({date:fixture.date,result,player:fact,stats});state.body.fatigue=clamp(state.body.fatigue+(fact.appeared?2:-4)-state.personality.professionalism*.025);state.sport.form=clamp(state.sport.form*.92+clamp(((stats.rating??6.5)-3.5)/6.5*100)*.08);
  }
  for(const [team,goals,conceded]of [[home,match.hg,match.ag],[away,match.ag,match.hg]]){
   const scorers=season.scorers.filter(s=>s.club===team.id),available=goals-(team.id===season.clubId?playerGoals:0);for(let g=0;g<available;g++){const p=random(seed,key+':scorer:'+team.id+':'+g);if(p<.65)scorers[p<.4?0:1].goals++;}
   for(const scorer of scorers){scorer.played++;scorer.ratingSum+=clamp(6.1+team.strength/180+(goals>conceded?.3:goals===conceded?.05:-.15)+(random(seed,key+':rating:'+scorer.id)-.5)*1.2,3.5,10);}
  }
 }
 season.closed=season.matches.every(m=>m.hg!==null);return season;
}
export function leagueStandings(season){return [...season.teams].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name)).map((t,index)=>({...t,position:index+1,you:t.id===season.clubId}));}
export function seasonHonours(season){
 if(!season.closed)return {titles:[],awards:[]};const table=leagueStandings(season),titles=[],awards=[];
 if(table[0].id===season.clubId&&season.player.played>0)titles.push('Campeón de liga');
 if(season.player.played>=20){const bestGoals=Math.max(...season.scorers.map(s=>s.goals)),bestRating=Math.max(...season.scorers.filter(s=>s.played>=20).map(s=>s.ratingSum/s.played));if(season.player.goals>0&&season.player.goals>=bestGoals)awards.push('Máximo goleador');if(season.player.ratingSum/season.player.played>=bestRating)awards.push('Jugador de la temporada');}
 return {titles,awards};
}
export function evolvingStrengths(season,previous={}){const result={...previous};for(const t of season.teams)result[t.id]=clamp(t.strength+(t.points/Math.max(1,t.played)-1.35)*3,25,95);return result;}
export function publicLeagueSeason(season){
 const table=leagueStandings(season),own=table.find(t=>t.you),teams=season.teams.map(t=>({id:t.id,name:t.name}));
 return {id:season.id,division:season.division,closed:season.closed,teams,rounds:Math.max(...season.matches.map(m=>m.round)),playedRounds:Math.max(0,...season.matches.filter(m=>m.hg!==null).map(m=>m.round)),position:own?.played?own.position:null,rows:table.map(({strength,form,...row})=>row),matches:season.matches.map(m=>({...m})),player:{played:season.player.played,starts:season.player.starts,goals:season.player.goals,assists:season.player.assists},scorers:[...season.scorers.map(s=>({name:s.name,club:teams.find(t=>t.id===s.club).name,goals:s.goals})),{name:'Tú',club:teams.find(t=>t.id===season.clubId).name,goals:season.player.goals}].sort((a,b)=>b.goals-a.goals).slice(0,5)};
}

// Fictional continental cup: eight groups, six rounds, then two-leg knockout
// ties and a single final. Qualification comes from the previous simulated league.
// It is deliberately described as an adapted format, not the current UEFA format.
const continentalCache=new Map();
export function createContinentalSeason({seed,year,clubId,previousLeague}){
 const previousDivision=previousLeague?divisionById(previousLeague.divisionId):null;
 const cacheKey=`${seed}:${year}:${previousDivision?.tier===1?leagueHash(JSON.stringify(previousLeague.teams)):0}`;let base=continentalCache.get(cacheKey);
 if(!base){
  const countries=['ESP','ENG','ITA','DEU','FRA','PRT','NLD','BEL','TUR','NOR'].filter(country=>FOOTBALL_CLUBS.some(c=>c.tier===1&&c.countryCode===country));let entrants=[];
  for(const country of countries){const club=FOOTBALL_CLUBS.find(c=>c.tier===1&&c.countryCode===country);const previous=previousDivision?.tier===1&&previousDivision.countryCode===country?previousLeague:createLeagueSeason({seed,year:year-1,clubId:club.id,tier:1,route:country==='ESP'?'domestic':'abroad'});if(previous!==previousLeague)advanceLeagueSeason(previous,`${year}-06-01`,{seed});entrants.push(...leagueStandings(previous).slice(0,4).map(t=>({...t,country})));}
  entrants=entrants.sort((a,b)=>b.strength-a.strength||a.id.localeCompare(b.id)).slice(0,32);
  if(entrants.length<32){const existing=new Set(entrants.map(t=>t.id));entrants.push(...FOOTBALL_CLUBS.filter(c=>c.tier===1&&countries.includes(c.countryCode)&&!existing.has(c.id)).sort((a,b)=>b.prestige-a.prestige).slice(0,32-entrants.length).map(c=>({id:c.id,name:c.name,strength:c.prestige,country:c.countryCode})));}
  // Seeded draw, reproducible across save/load and both game modes.
  entrants.sort((a,b)=>leagueHash(`${seed}:${year}:draw:${a.id}`)-leagueHash(`${seed}:${year}:draw:${b.id}`));
  const teams=entrants.map(t=>({id:t.id,name:t.name,strength:t.strength,form:0,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
  const groups=[],matches=[];for(let g=0;g<8;g++){const ids=[g*4,g*4+1,g*4+2,g*4+3];groups.push(ids);const pairs=[[[0,3],[1,2]],[[0,2],[3,1]],[[0,1],[2,3]],[[3,0],[2,1]],[[2,0],[1,3]],[[1,0],[3,2]]];for(let r=0;r<6;r++)for(const[a,b]of pairs[r]){const date=iso(weekday(year,8,8)+r*14*86400000);matches.push({round:r+1,date,home:ids[a],away:ids[b],hg:null,ag:null,stage:`Grupo ${String.fromCharCode(65+g)}`,group:g});}}
  const season={id:`${year}-${String(year+1).slice(-2)}`,year,teams,matches,groups,winner:null};
  for(const m of matches)continentalScore(season,m,seed);
  const rankings=groups.map(ids=>[...ids].sort((a,b)=>compareTeams(teams[a],teams[b])));const qualified=rankings.flatMap((ids,i)=>[ids[0],rankings[7-i][1]]);
  let active=qualified;for(const[stage,month,day]of [['Octavos',1,9],['Cuartos',2,9],['Semifinal',3,13],['Final',4,25]]){
   const winners=[];for(let i=0;i<active.length;i+=2){const home=active[i],away=active[i+1],first={round:7+matches.length,date:iso(weekday(year+1,month,day,stage==='Final'?6:2)),home,away,hg:null,ag:null,stage};continentalScore(season,first,seed,false);matches.push(first);let hg=first.hg,ag=first.ag;
    if(stage!=='Final'){const second={round:first.round+1,date:iso(weekday(year+1,month,day+14)),home:away,away:home,hg:null,ag:null,stage};continentalScore(season,second,seed,false);matches.push(second);hg+=second.ag;ag+=second.hg;}
    // Tied aggregate: explicit shoot-out, no away-goal rule or invented draw winner.
    const winner=hg===ag?(random(seed,`pens:${year}:${stage}:${home}:${away}`)<.5?home:away):hg>ag?home:away;
    matches.at(-1).winner=winner;if(hg===ag)matches.at(-1).penalties=winner===matches.at(-1).home?{home:5,away:4}:{home:4,away:5};winners.push(winner);
   }active=winners;
  }
  season.winner=active[0];base=season;continentalCache.set(cacheKey,base);if(continentalCache.size>40)continentalCache.delete(continentalCache.keys().next().value);
 }
 const season=structuredClone(base);season.clubId=clubId;season.qualified=season.teams.some(t=>t.id===clubId);return season;
}
const compareTeams=(a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id.localeCompare(b.id);
function continentalScore(season,m,seed,table=true){const h=season.teams[m.home],a=season.teams[m.away],diff=h.strength-a.strength,key=`continental:${season.year}:${m.round}:${h.id}:${a.id}`;m.hg=poisson(seed,key+':h',clamp(1.45*Math.exp(diff/65),.3,3.8));m.ag=poisson(seed,key+':a',clamp(1.15*Math.exp(-diff/65),.25,3.5));if(table){addTeam(h,m.hg,m.ag);addTeam(a,m.ag,m.hg);}}
export function publicContinentalSeason(season,date){
 const matches=season.matches.filter(m=>m.date<=date),qualified=season.qualified,own=season.teams.findIndex(t=>t.id===season.clubId),group=season.groups.find(ids=>ids.includes(own));
 const rows=group?group.map(i=>({...season.teams[i],played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0})):[];
 for(const m of matches.filter(m=>m.group!==undefined)){const h=rows.find(t=>t.id===season.teams[m.home].id),a=rows.find(t=>t.id===season.teams[m.away].id);if(h&&a){addTeam(h,m.hg,m.ag);addTeam(a,m.ag,m.hg);}}
 return {qualified,format:'Formato adaptado: grupos y eliminatorias',rows:rows.sort(compareTeams).map((r,i)=>({...r,position:i+1,you:r.id===season.clubId})),teams:season.teams.map(t=>({id:t.id,name:t.name})),matches:matches.map(m=>({...m})),winner:season.matches.at(-1).date<=date?season.teams[season.winner].name:null,champion:qualified&&season.teams[season.winner].id===season.clubId&&season.matches.at(-1).date<=date};
}
const careerCache=new Map();
export function competitionForCareer(state){
 const seed=state.rngState.football.seed,clubId=state.professional.registrationClub,year=Number(state.season.slice(0,4)),tier=state.professional.leagueTier,route=state.professional.route;
 const key=`${seed}:${year}:${clubId}:${tier}:${route}`;let value=careerCache.get(key);if(!value){const league=createLeagueSeason({seed,year,clubId,tier,route});advanceLeagueSeason(league,`${year+1}-06-30`,{seed});const continental=createContinentalSeason({seed,year,clubId});value={league,continental};careerCache.set(key,value);if(careerCache.size>80)careerCache.delete(careerCache.keys().next().value);}return value;
}
export function careerCompetitionFixture(state,date){
 if(typeof state.world.redditCompetitionFrom!=='string'||date<state.world.redditCompetitionFrom)return null;
 const {league,continental}=competitionForCareer(state),club=state.professional.registrationClub;
 for(const [season,competition]of [[league,'league'],[continental,'champions']]){if(competition==='champions'&&!continental.qualified)continue;const m=season.matches.find(m=>m.date===date&&(season.teams[m.home].id===club||season.teams[m.away].id===club));if(!m)continue;const home=season.teams[m.home],away=season.teams[m.away],homeAway=home.id===club?'home':'away',opponent=homeAway==='home'?away:home;
 return {fixture:{id:`fixture:${state.season}:${date}:${club}`,date,season:state.season,competition,club,opponent:opponent.name,opponentClubId:opponent.id,homeAway,official:true},result:{homeGoals:m.hg,awayGoals:m.ag,halfTimeHomeGoals:Math.floor(m.hg/2),halfTimeAwayGoals:Math.floor(m.ag/2),outcome:m.hg===m.ag?'draw':(homeAway==='home'?m.hg>m.ag:m.ag>m.hg)?'win':'loss'}};}
 return null;
}
export function advanceContinentalPlayer(league,cup,toDate,{seed,playerState,producePlayerStats}){
 league.cupPlayer??={played:0,starts:0,goals:0,assists:0,minutes:0,ratingSum:0,matches:[]};
 if(!cup.qualified)return;
 for(const m of cup.matches.filter(m=>m.date<=toDate&&(cup.teams[m.home].id===league.clubId||cup.teams[m.away].id===league.clubId))){
  if(league.cupPlayer.matches.some(r=>r.date===m.date))continue;
  advanceLeagueSeason(league,m.date,{seed,playerState,producePlayerStats});
  const s=playerState;s.date=m.date;s.age=18+Number(m.date.slice(0,4))-2026-(m.date.slice(5)<'07-01'?1:0);
  const fact=playerFact(s,{id:league.id+':cup'},m,seed),homeAway=cup.teams[m.home].id===league.clubId?'home':'away',opponent=cup.teams[homeAway==='home'?m.away:m.home],performance={age:s.age,careerRole:s.role,roleScore:s.sport.roleScore,form:s.sport.form,fitness:s.body.fitness,fatigue:s.body.fatigue,coachTrust:s.personality.professionalism,leagueTier:s.professional.leagueTier,opponentLevel:opponent.strength,positionIdentity:s.sport.positionIdentity};
  const fixture={id:`daily-cup:${league.id}:${m.round}:${league.clubId}`,date:m.date,season:league.id,competition:'champions',club:league.clubId,opponent:opponent.name,opponentClubId:opponent.id,homeAway,official:true},result={homeGoals:m.hg,awayGoals:m.ag,halfTimeHomeGoals:Math.floor(m.hg/2),halfTimeAwayGoals:Math.floor(m.ag/2),outcome:m.hg===m.ag?'draw':(homeAway==='home'?m.hg>m.ag:m.ag>m.hg)?'win':'loss'},stats=producePlayerStats(s,fixture,fact,result,performance),p=league.cupPlayer;
  if(fact.appeared){p.played++;p.starts+=Number(fact.started);p.goals+=stats.goals;p.assists+=stats.assists;p.minutes+=fact.minutes;p.ratingSum+=stats.rating??6;s.sport.appearances++;s.body.fatigue=clamp(s.body.fatigue+3);}
  p.matches.push({date:m.date,result,player:fact,stats});
 }
}
export function careerLeagueOutcome(state){const {league}=competitionForCareer(state),table=leagueStandings(league),row=table.find(r=>r.you);return row.position>table.length-3?'relegated':row.position<=3?'playoff':'safe';}
