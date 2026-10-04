import {competitionForCareer,publicContinentalSeason,leagueStandings,careerCompetitionFixture} from '../shared/league-simulator.mjs';
import {scheduledLeagueFixtures,recordOfficialMatchInPlace} from '../../dist/simulation/match-model.js';
import {resolveFixtureDivision} from '../../dist/catalog/football/fixture-opponent.js';
import {FOOTBALL_CLUBS,clubsForDivision} from '../../dist/catalog/football/index.js';
import {formatClubName} from '../../web/club-names.js';
const hash=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
const stamp=date=>Date.parse(date+'T00:00:00Z');
// Presentation-only league simulation. Confirmed player-club scores are always
// authoritative; other fixtures are reproducible projections, never save writes.
function legacyCareerSports(state){
 const club=state.professional.registrationClub,division=resolveFixtureDivision(club,state.professional.leagueTier,state.professional.route,state.flags.ABROAD_ROUTE===true);
 const actual=(state.world.sportMatchModel?.fixtures??[]).filter(m=>m.season===state.season&&m.club===club);
 const upcoming=scheduledLeagueFixtures(state,60);
 if(!division)return {club:formatClubName(club),recent:actual.slice(-1),allRecent:actual,upcoming:upcoming.slice(0,3),rows:[],position:null,played:0};
 const members=[...clubsForDivision(division.id)],cohort=new Map(members.map(c=>[c.id,{id:c.id,name:c.name,prestige:c.prestige}]));
 if(!cohort.has(club))cohort.set(club,{id:club,name:formatClubName(club),prestige:state.professional.clubPrestigeScore??40});
 // Synthetic/canonical clubs occupy an additional league slot. Add a stable
 // fictional catalog neighbour to keep every round even and avoid biased byes.
 if(cohort.size%2){const neighbour=FOOTBALL_CLUBS.filter(c=>c.countryCode===division.countryCode&&!cohort.has(c.id)).sort((a,b)=>Math.abs(a.tier-division.tier)-Math.abs(b.tier-division.tier)||a.id.localeCompare(b.id))[0];if(neighbour)cohort.set(neighbour.id,{id:neighbour.id,name:neighbour.name,prestige:neighbour.prestige});}
 const rows=new Map([...cohort.values()].map(c=>[c.id,{id:c.id,name:c.name,prestige:c.prestige,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0,you:c.id===club}]));
 const start=`${state.season.slice(0,4)}-07-01`,shadow=structuredClone(state);
 shadow.date=start;shadow.runtime.day-=Math.round((stamp(state.date)-stamp(start))/86400000);delete shadow.world.sportMatchModel;
 const dates=scheduledLeagueFixtures(shadow,370).filter(m=>m.date<=state.date);
 const known=new Map(actual.map(m=>[m.date,m]));
 const add=(id,gf,ga)=>{const r=rows.get(id);if(!r)return;r.played++;r.gf+=gf;r.ga+=ga;if(gf>ga){r.won++;r.points+=3;}else if(gf===ga){r.drawn++;r.points++;}else r.lost++;};
 for(const fixture of dates){
  const opponent=fixture.opponentClubId;if(!rows.has(opponent))continue;
  let match=known.get(fixture.date);
  if(!match?.result){shadow.date=fixture.date;shadow.runtime.day=Math.round((stamp(fixture.date)-stamp(start))/86400000)+(state.runtime.day-Math.round((stamp(state.date)-stamp(start))/86400000));match=recordOfficialMatchInPlace(shadow,{appeared:false,debutOccurred:false,injuryUnavailable:false});}
  if(!match?.result)continue;
  const cg=match.homeAway==='home'?match.result.homeGoals:match.result.awayGoals,og=match.homeAway==='home'?match.result.awayGoals:match.result.homeGoals;
  add(club,cg,og);add(opponent,og,cg);
  const remaining=[...cohort.keys()].filter(id=>id!==club&&id!==opponent).sort((a,b)=>hash(`${state.rngState.football.seed}:${state.season}:${fixture.date}:${a}`)-hash(`${state.rngState.football.seed}:${state.season}:${fixture.date}:${b}`)||a.localeCompare(b));
  for(let i=0;i+1<remaining.length;i+=2){const a=remaining[i],b=remaining[i+1],strength=rows.get(a).prestige-rows.get(b).prestige,key=`${state.rngState.football.seed}:${state.season}:${fixture.date}:${a}:${b}`;const ga=Math.max(0,Math.min(5,hash(key+':home')%4+(strength>25?1:0))),gb=Math.max(0,Math.min(5,hash(key+':away')%4+(strength< -25?1:0)));add(a,ga,gb);add(b,gb,ga);}
 }
 const sorted=[...rows.values()].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name)).map((r,i)=>({...r,position:i+1}));
 const own=sorted.find(r=>r.you);
 return {club:formatClubName(club),division:division.name,season:state.season,recent:actual.filter(m=>m.result).slice(-1),allRecent:actual.filter(m=>m.result),upcoming:upcoming.slice(0,1),rows:sorted,position:own?.played?own.position:null,played:own?.played??0,points:own?.points??0,simulated:true};
}
export function createCareerSportsView(){let key='',cached=null;return session=>{const view=session.getView(),next=`${view.sessionId}:${view.revision}`;if(next!==key){cached=projectCareerSports(session.exportSnapshot().state);key=next;}return cached;};}

export function projectCareerSports(state){
 if(typeof state.world.redditCompetitionFrom!=='string'||state.date<state.world.redditCompetitionFrom)return legacyCareerSports(state);
 const {league,continental}=competitionForCareer(state),rows=league.teams.map(t=>({...t,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
 const matches=league.matches.filter(m=>m.date<=state.date);
 for(const m of matches){for(const [index,gf,ga]of [[m.home,m.hg,m.ag],[m.away,m.ag,m.hg]]){const r=rows[index];r.played++;r.gf+=gf;r.ga+=ga;if(gf>ga){r.won++;r.points+=3;}else if(gf===ga){r.drawn++;r.points++;}else r.lost++;}}
 const table=leagueStandings({...league,teams:rows}),own=table.find(r=>r.you),club=state.professional.registrationClub;
 const facts=(state.world.sportMatchModel?.fixtures??[]).filter(m=>m.season===state.season&&m.club===club);
 const upcoming=[];for(let d=0;d<370;d++){const date=new Date(Date.parse(state.date+'T00:00:00Z')+d*86400000).toISOString().slice(0,10);if(date>`${league.year+1}-05-31`)break;const match=careerCompetitionFixture(state,date);if(match&&!facts.some(m=>m.date===date))upcoming.push(match.fixture);}
 return {club:formatClubName(club),season:state.season,division:league.division,rows:table,position:own.played?own.position:null,points:own.points,played:own.played,recent:facts.slice(-1),allRecent:facts,upcoming:upcoming.slice(0,1),league:{teams:league.teams.map(t=>({id:t.id,name:t.name})),matches},continental:publicContinentalSeason(continental,state.date)};
}
