import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../../dist/session/game-session.js';
import {projectCareerSports,createCareerSportsView} from '../client/career-sports.mjs';
import {competitionForCareer,publicContinentalSeason} from '../shared/league-simulator.mjs';
import {publicSportsContinental} from '../shared/sports-presentation.mjs';
import {presentCareerSports,MissingCareerSportsTranslation} from '../client/career-sports-locale.mjs';
import {dailySportsEnglish} from '../i18n/daily-sports-catalog.mjs';
import {resolveFixtureDivision} from '../../dist/catalog/football/fixture-opponent.js';
const stripMetadata=cup=>{const {formatId,...rest}=cup;return {...rest,matches:rest.matches.map(({stageId,...match})=>match)};};
test('career projection supplies division and cup IDs without changing saved state, scores or RNG',async()=>{
 const session=await GameSession.create(424242,{redditCompetitions:true}),state=session.exportSnapshot().state;
 // Projection at a season end exercises every cup phase without dispatching a career command.
 state.date='2027-06-30';const before=JSON.stringify(state),view=projectCareerSports(state),{league,continental}=competitionForCareer(state);
 assert.equal(view.divisionId,league.divisionId);assert.deepEqual(stripMetadata(view.continental),publicContinentalSeason(continental,state.date));assert.equal(JSON.stringify(state),before);
 const en=presentCareerSports(view,'en');assert.equal(en.division,dailySportsEnglish.divisions[league.divisionId]);assert.equal(en.continental.format,'Adapted format: group stage and knockout rounds');assert.equal(en.rows,view.rows);assert.equal(en.league,view.league);assert.equal(en.continental.winner,view.continental.winner);assert.equal(en.continental.champion,view.continental.champion);
 for(const [i,m] of en.continental.matches.entries()){const {stage,...facts}=m,{stage:esStage,...source}=view.continental.matches[i];assert.deepEqual(facts,source);assert.equal(typeof stage,'string');}
 assert.equal(JSON.stringify(state),before);assert.equal(presentCareerSports(view,'es'),view);
});
test('legacy career resolves its division ID without migrating or writing the save',async()=>{
 const session=await GameSession.create(424242),state=session.exportSnapshot().state,before=JSON.stringify(state),view=projectCareerSports(state);
 const division=resolveFixtureDivision(state.professional.registrationClub,state.professional.leagueTier,state.professional.route,state.flags.ABROAD_ROUTE===true);
 assert.equal(view.divisionId,division.id);assert.equal(view.simulated,true);assert.equal(presentCareerSports(view,'en').division,dailySportsEnglish.divisions[division.id]);assert.equal(JSON.stringify(state),before);
});
test('all division IDs and cup phases reuse the established sports catalog without changing teams or numeric fields',()=>{
 const matches=[...Array.from({length:8},(_,group)=>({stage:'Grupo '+String.fromCharCode(65+group),group,hg:3,ag:2,home:0,away:1})),...['Octavos','Cuartos','Semifinal','Final'].map(stage=>({stage,hg:1,ag:1,penalties:{home:5,away:4},winner:0}))];
 const cup=publicSportsContinental({format:'Formato adaptado: grupos y eliminatorias',matches,winner:'Example City',qualified:true,rows:[],teams:[]});
 for(const divisionId of Object.keys(dailySportsEnglish.divisions)){const original={divisionId,division:'Original ES',rows:[{name:'Example City',points:7}],continental:cup},before=JSON.stringify(original),en=presentCareerSports(original,'en');assert.equal(en.division,dailySportsEnglish.divisions[divisionId]);assert.deepEqual(en.continental.matches.map(m=>m.stage),['Group A','Group B','Group C','Group D','Group E','Group F','Group G','Group H','Round of 16','Quarter-final','Semi-final','Final']);assert.equal(en.rows,original.rows);assert.equal(JSON.stringify(original),before);}
});
test('uncovered sports metadata fails explicitly in EN and ES remains the original object',()=>{
 for(const source of [{division:'Original ES',continental:null},{divisionId:'UNKNOWN',division:'Original ES',continental:null},{divisionId:'ESP_D1',continental:{formatId:'UNKNOWN',matches:[]}},{divisionId:'ESP_D1',continental:{formatId:'groups-knockout-v1',matches:[{stage:'unknown',stageId:null}]}}]){const before=JSON.stringify(source);assert.throws(()=>presentCareerSports(source,'en'),error=>error instanceof MissingCareerSportsTranslation&&error.code==='MISSING_CAREER_SPORTS_TRANSLATION');assert.equal(presentCareerSports(source,'es'),source);assert.equal(JSON.stringify(source),before);}
});
test('locale switching never invalidates the career projection cache or changes confirmed snapshots',async()=>{
 const session=await GameSession.create(424242,{redditCompetitions:true}),before=JSON.stringify(session.exportSnapshot()),viewFor=createCareerSportsView(),view=viewFor(session);
 for(let i=0;i<20;i++){presentCareerSports(view,'en');assert.equal(presentCareerSports(view,'es'),view);assert.equal(viewFor(session),view);}
 assert.equal(JSON.stringify(session.exportSnapshot()),before);
});
