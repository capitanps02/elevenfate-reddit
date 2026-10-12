import test from 'node:test';
import assert from 'node:assert/strict';
import {publicDailyLeague,publicDailyContinental,publicDailyHonours} from '../server/daily-sports-presentation.mjs';
import {translateDailyDivision,translateDailyHonour,translateDailyFormat,translateDailyFixtureStage} from '../client/daily-sports-locale.mjs';
import {dailySportsEnglish} from '../i18n/daily-sports-catalog.mjs';
import {MissingDailyTranslation} from '../client/daily-story-locale.mjs';
test('all 27 fictional division IDs have English names without changing season data',()=>{
 assert.equal(Object.keys(dailySportsEnglish.divisions).length,27);
 for(const divisionId of Object.keys(dailySportsEnglish.divisions)){
  const original={id:'2026-27',division:'Nombre ES',matches:[{hg:2,ag:1}],rows:[{name:'Club A',points:6}]},before=JSON.stringify(original),view=publicDailyLeague(original,divisionId);
  assert.equal(translateDailyDivision(view,'en'),dailySportsEnglish.divisions[divisionId]);assert.equal(translateDailyDivision(view,'es'),'Nombre ES');assert.equal(view.matches,original.matches);assert.equal(view.rows,original.rows);assert.equal(JSON.stringify(original),before);
 }
 assert.throws(()=>translateDailyDivision({divisionId:'new'},'en'),MissingDailyTranslation);
});
test('four legacy honour enum values get public IDs and translated labels only',()=>{
 const original=['Campeón de liga','Máximo goleador','Jugador de la temporada','Champions · formato adaptado'].map(title=>({title,club:'Club A',season:'2026-27'})),before=JSON.stringify(original),view=publicDailyHonours(original);
 assert.deepEqual(view.map(item=>translateDailyHonour(item,'en')),['League champion','Top scorer','Player of the season','Champions League · adapted format']);
 for(const [index,item]of view.entries()){assert.equal(translateDailyHonour(item,'es'),original[index].title);assert.equal(item.club,'Club A');assert.equal(item.season,'2026-27');}
 assert.equal(JSON.stringify(original),before);assert.throws(()=>translateDailyHonour(publicDailyHonours([{title:'Unknown award'}])[0],'en'),MissingDailyTranslation);
});
test('continental group and knockout metadata do not change scores, winners or seed inputs',()=>{
 const matches=[...Array.from({length:8},(_,group)=>({stage:'Grupo '+String.fromCharCode(65+group),group,round:1,hg:3,ag:2})),...['Octavos','Cuartos','Semifinal','Final'].map(stage=>({stage,round:199,hg:1,ag:1,penalties:{home:5,away:4},winner:0}))];
 const original={format:'Formato adaptado: grupos y eliminatorias',matches,winner:'Club A',qualified:true},before=JSON.stringify(original),view=publicDailyContinental(original);
 assert.equal(translateDailyFormat(view,'en'),'Adapted format: group stage and knockout rounds');assert.equal(translateDailyFormat(view,'es'),original.format);
 assert.deepEqual(view.matches.map(match=>translateDailyFixtureStage(match,'en')),['Group A','Group B','Group C','Group D','Group E','Group F','Group G','Group H','Round of 16','Quarter-final','Semi-final','Final']);
 for(const [index,match]of view.matches.entries()){const {stageId,...unchanged}=match;assert.deepEqual(unchanged,original.matches[index]);assert.equal(translateDailyFixtureStage(match,'es'),original.matches[index].stage);}
 assert.equal(JSON.stringify(original),before);assert.equal(view.winner,'Club A');assert.throws(()=>translateDailyFixtureStage({stage:'unknown'},'en'),MissingDailyTranslation);assert.equal(translateDailyFixtureStage({round:4},'en'),undefined);
});
