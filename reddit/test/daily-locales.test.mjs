import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocale} from '../i18n/runtime.mjs';
import {createDailyStory,settleDailyPromises} from '../server/daily-stories.mjs';
import {STAGES} from '../server/daily-run.mjs';
import {dailyTradeoff} from '../i18n/daily-presentation.mjs';
import fs from 'node:fs';
import ts from 'typescript';
import {newDailyRun,applyDailyCommand,dailyRunView} from '../server/daily-run.mjs';

test('all stage continuation controls translate their age ranges',()=>{
 const locale=createLocale({initial:'en'});
 for(const stage of STAGES)assert.equal(locale.text(`Siguiente etapa · ${stage.from}–${stage.to} →`),`Next stage · ${stage.from}–${stage.to} →`);
});

test('final score compositions translate every label without translating parameters twice',()=>{
 const locale=createLocale({initial:'en'});
 for(const [es,en] of [['Rendimiento en partidos','Match performance'],['Participación deportiva','Playing involvement'],['Estado físico','Fitness'],['Técnica','Technique'],['Profesionalidad','Professionalism'],['Control de carrera','Career control']])
  assert.equal(locale.text(`${es} · 30% · 143 puntos`),`${en} · 30% · 143 points`);
});

test('all Daily story variants, ages, contexts and callback branches translate without modifying their source',()=>{
 const locale=createLocale({initial:'en'});let scenarios=0;
 for(let stage=0;stage<6;stage++)for(let slot=0;slot<4;slot++)for(let variant=0;variant<3;variant++)for(let branch=0;branch<3;branch++){
  const run={seed:42,stage,resolved:slot+1,state:{age:STAGES[stage].from,body:{fatigue:12,risk:18}},narrative:{family:branch===1?20:50,mentor:branch===2?1:0,promises:branch===2?[{kind:'family',dueStage:stage,status:'pending',sourceTitle:'Una llamada después de entrenar'}]:[]}};
  const before=structuredClone(run),event=createDailyStory(run,STAGES[stage],key=>key.endsWith(':order')?0:variant),original=structuredClone(event);
  for(const source of [event.text.title,event.text.body,...event.choices.map(c=>c.label),...event.outcomes.flatMap(o=>o.messages)]){
   assert.notEqual(locale.text(source),source,source);
  }
  assert.deepEqual(run,before);assert.deepEqual(event,original);scenarios++;
 }
 assert.equal(scenarios,216);assert.deepEqual(locale.missing(),[]);
 for(const stage of STAGES)assert.notEqual(locale.text(stage.name),stage.name);
});
test('family and mentoring callbacks translate while keeping resolution and effects canonical',()=>{
 const locale=createLocale({initial:'en'});
 for(const kind of ['family','mentor'])for(const response of ['protect','mentor','football']){
  const run={stage:1,state:{control:{career:50},personality:{professionalism:50}},narrative:{family:50,promises:[{kind,response,dueStage:1,status:'pending'}],callbacks:[]}};
  settleDailyPromises(run);const before=structuredClone(run);
  assert.notEqual(locale.text(run.narrative.callbacks[0].text),run.narrative.callbacks[0].text);
  assert.deepEqual(run,before);
 }
 assert.deepEqual(locale.missing(),[]);
});
test('Daily tradeoffs translate only the known effect grammar, preserving signs and values',()=>{
 const locale=createLocale({initial:'en'});
 assert.equal(dailyTradeoff(locale,'Calma +5 · Fatiga -4 · Papel +2'),'Composure +5 · Fatigue -4 · Role +2');
 assert.equal(dailyTradeoff(locale,'Técnica +6 máx. · Físico +3 máx. · Forma -2'),'Technique +6 max. · Fitness +3 max. · Form -2');
 assert.equal(dailyTradeoff(locale,'Riesgo -0.5 · Control +0'),'Risk -0.5 · Control +0');
 assert.equal(dailyTradeoff(locale,'PRIVATE_EFFECT_ID +7'),'PRIVATE_EFFECT_ID +7');
 locale.set('es');assert.equal(dailyTradeoff(locale,'Técnica +6 máx. · Papel +4'),'Técnica +6 máx. · Papel +4');
});
test('all frozen v3/v4 fallback narratives and labels remain translatable, including v4 workload context',()=>{
 const locale=createLocale({initial:'en'});
 for(const version of [3,4]){
  const file=new URL(`../server/daily-run-v${version}.mjs`,import.meta.url),source=ts.createSourceFile(file.pathname,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  const declarations=new Map();
  function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))declarations.set(node.name.text,node.initializer);ts.forEachChild(node,visit);}visit(source);
  for(const stage of declarations.get('fallback').elements)for(const pair of stage.elements){
   const [title,body]=pair.elements.map(n=>n.text);
   assert.notEqual(locale.text(title),title,title);assert.notEqual(locale.text(body),body,body);
   if(version===4)for(const context of ['El calendario deja poco tiempo para recuperarte.','Una semana de margen permite planificar mejor.','El equipo pide resultados inmediatos.','Tu fatiga actual es 12 y tu riesgo físico 18.']){
    const translated=locale.text(body+' '+context);assert.notEqual(translated,body+' '+context);assert.ok(!translated.includes(context));
   }
  }
  for(const category of declarations.get('variants').elements)for(const choice of category.elements){const label=choice.elements[0].text;assert.notEqual(locale.text(label),label);assert.notEqual(locale.text(label+'. Tu elección acompaña el siguiente tramo de la temporada.'),label+'. Tu elección acompaña el siguiente tramo de la temporada.');}
 }
 assert.deepEqual(locale.missing(),[]);
});
for(const rulesVersion of [3,4])test(`a complete frozen v${rulesVersion} career survives English projections at every choice`,()=>{
 const run=newDailyRun({seed:71,rulesVersion}),locale=createLocale({initial:'en'});let commands=0;
 while(!run.finished){
  const view=dailyRunView(run),before=JSON.stringify(run);
  for(const source of [view.stage.name,view.lastMessage,...(view.decision?[view.decision.title,view.decision.body,...view.decision.choices.map(c=>c.label)]:[])].filter(Boolean))assert.notEqual(locale.text(source),source,source);
  locale.set('es');locale.set('en');assert.equal(JSON.stringify(run),before);
  const command=view.screen==='summary'?{type:'acknowledge'}:{type:'choose',choiceId:view.screen==='club'?view.clubs[0].id:view.decision.choices[0].id};
  applyDailyCommand(run,{...command,commandId:`locale-${rulesVersion}-${commands++}`,expectedRevision:run.revision});
  assert.ok(commands<=35);
 }
 assert.equal(run.resolved,30);assert.deepEqual(locale.missing(),[]);
});
