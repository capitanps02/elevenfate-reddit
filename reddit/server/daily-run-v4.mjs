import * as legacy from './daily-run-v3.mjs';
import {createInitialState} from '../../dist/content/initial-state.js';
import {FOOTBALL_CLUBS} from '../../dist/catalog/football/index.js';
import {eligibleChoices} from '../../dist/narrative/choice-eligibility.js';
import {resolveChoiceInPlace} from '../../dist/narrative/resolver.js';
import {playerFacingMessages} from '../../dist/narrative/consequences.js';
import {playerStatsForFixture} from '../../dist/simulation/match-model.js';
import {createLeagueSeason,advanceLeagueSeason,advanceContinentalPlayer,seasonHonours,evolvingStrengths,publicLeagueSeason,createContinentalSeason,publicContinentalSeason} from '../shared/league-simulator.mjs';
import {CareerError} from './career-service.mjs';

export const STAGES=[{from:18,to:20,phase:'18_20',name:'Primeros pasos'},{from:20,to:23,phase:'20_23',name:'Hacerse un sitio'},{from:23,to:26,phase:'23_26',name:'El salto'},{from:26,to:30,phase:'26_30',name:'Años de plenitud'},{from:30,to:34,phase:'30_34',name:'Cambiar para seguir'},{from:34,to:38,phase:'34_plus',name:'El último capítulo'}];
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const clubById=new Map(FOOTBALL_CLUBS.map(c=>[c.id,c]));
export const hash=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
const roll=(run,key)=>hash(`${run.seed}:${key}`)/4294967296;
const fallback=[
 [['Un sitio en el vestuario','Un veterano te invita a quedarte después del entrenamiento. Mañana compites por tus primeros minutos.'],['La primera llamada','Tu familia quiere verte este fin de semana. El entrenador ha preparado una sesión extra.'],['Piernas cargadas','La carga de trabajo empieza a pasar factura. El próximo partido puede ser tu oportunidad.'],['Primer foco','Una entrevista te pide hablar de tu futuro antes de que tengas un puesto fijo.']],
 [['Ganarte el puesto','Un compañero ocupa tu posición. El entrenador quiere ver quién responde mejor esta semana.'],['Fuera del campo','Un amigo de siempre necesita que estés presente. No todo se resuelve con dinero.'],['El ritmo de la temporada','Estás jugando más, pero el cansancio se acumula. Tienes que elegir cómo sostenerlo.'],['Una voz propia','Te preguntan por tu papel en el equipo. Puedes pedir más minutos o dejar que hable tu trabajo.']],
 [['Subir el nivel','Los rivales ya conocen tus movimientos. El cuerpo técnico propone trabajar una nueva variante.'],['Dos vidas','La carrera crece y tu vida personal pide espacio. Hay una conversación pendiente.'],['No forzar','Notas una molestia al acelerar. Ocultarla te permitiría entrar en la convocatoria.'],['Una promesa pública','Un periodista te invita a prometer que serás la figura del equipo esta temporada.']],
 [['Partido grande','Se acerca una semana decisiva. El entrenador te pregunta cómo quieres prepararte.'],['Estar a la altura','Una persona importante para ti atraviesa un mal momento mientras el equipo exige concentración.'],['Administrar el cuerpo','Acumulas minutos. Un día de descanso puede darte aire, pero no quieres perder el ritmo.'],['El peso del vestuario','Los jóvenes te escuchan. Puedes acompañarlos, centrarte en ti o asumir una voz más fuerte.']],
 [['Otra forma de jugar','Ya no ganas cada duelo por velocidad. Tu lectura del juego puede abrir un camino distinto.'],['Volver a casa','Tu familia quiere recuperar tiempo contigo. La próxima temporada puede cambiar tus prioridades.'],['Elegir los esfuerzos','El físico exige una planificación nueva. La rutina que funcionaba a los veinte ya no basta.'],['Tu lugar','Un jugador joven pide minutos. El entrenador quiere saber cómo afrontarás la competencia.']],
 [['El último recurso','Tu experiencia puede decidir un partido. El equipo necesita saber qué puedes ofrecer todavía.'],['Tiempo que no vuelve','Un compromiso familiar coincide con una concentración. Quedan pocas temporadas y muchas cosas pendientes.'],['Llegar al final','El cuerpo tarda más en recuperarse. Puedes cuidarlo, insistir o reinventar tu preparación.'],['Cómo quieres que te recuerden','Se acerca el cierre de tu carrera. Puedes poner el foco en tu rendimiento, en el equipo o en tu vida fuera del fútbol.']]
];
const variants=[
 [['Trabajar una variante técnica',[['professional.technique',8],['sport.form',4],['body.fatigue',5]]],['Ganar la confianza del entrenador',[['sport.roleScore',9],['personality.professionalism',4],['body.fatigue',3]]],['Buscar mi momento por mi cuenta',[['sport.form',8],['sport.roleScore',-3],['body.fatigue',9]]]],
 [['Reservar tiempo para los míos',[['control.career',7],['personality.professionalism',-2],['body.fatigue',-6]]],['Hablar y encontrar un equilibrio',[['control.career',4],['personality.professionalism',4]]],['Priorizar el fútbol esta vez',[['sport.roleScore',6],['professional.technique',4],['control.career',-5]]]],
 [['Descansar y ajustar la carga',[['body.fitness',8],['body.fatigue',-14],['sport.roleScore',-2]]],['Entrenar con un plan específico',[['professional.technique',6],['body.fitness',4],['body.fatigue',-4]]],['Forzar para no perder minutos',[['sport.roleScore',8],['body.fatigue',14],['body.risk',10]]]],
 [['Responder con trabajo',[['personality.professionalism',7],['professional.composure',6],['sport.form',3]]],['Hablar con el entrenador',[['control.career',5],['sport.roleScore',5]]],['Asumir el protagonismo',[['reputation.prestige',9],['sport.form',7],['body.fatigue',6]]]]
];
function fallbackEvent(run){
 const stage=STAGES[run.stage],slot=run.resolved%5-1;let [title,body]=fallback[run.stage][slot];
 const context=hash(`${run.seed}:${run.stage}:${slot}`)%3;
 if(slot===0&&run.state.sport.roleScore<40){title='Minutos que todavía no llegan';body='El entrenador te mantiene como alternativa. Puedes invertir en técnica, pedir un plan de minutos o intentar destacar por tu cuenta.';}
 if(slot===2&&run.state.body.risk>=40){title='Una señal que se repite';body='El cuerpo acumula riesgo físico. Recuperarte tiene un coste deportivo inmediato, pero forzar puede reducir tus próximas convocatorias.';}
 if(slot===3&&run.state.professional.technique>=80){title='La experiencia también se comparte';body='Los jóvenes te piden consejo. El entrenador observa cómo utilizas tu experiencia dentro del grupo.';}
 const source=variants[slot].map(([label,effects],i)=>[label,effects.map(([path,delta])=>[path,delta>0?Math.round(delta*(i===context?1.15:.7)):delta])]);
 if(slot===2){source[1][1].push(['body.fatigue',8],['body.risk',4]);source[0][1].push(['professional.technique',-2],['body.risk',-8]);}
 if(slot===0){source[1][1].push(['control.career',-4]);source[2][1].push(['personality.professionalism',-4]);}
 if(slot===1)source[1][1].push(['sport.roleScore',-3]);
 if(slot===3)source[1][1].push(['body.fatigue',5]);
 for(const choice of source){const merged=new Map();for(const [path,delta]of choice[1])merged.set(path,(merged.get(path)??0)+delta);choice[1]=[...merged].filter(([,delta])=>delta!==0);}
 const shift=hash(`${run.seed}:${run.stage}:${slot}:order`)%3,choices=[...source.slice(shift),...source.slice(0,shift)];
 const situation=slot===2?' Tu fatiga actual es '+Math.round(run.state.body.fatigue)+' y tu riesgo físico '+Math.round(run.state.body.risk)+'.':[' El calendario deja poco tiempo para recuperarte.',' Una semana de margen permite planificar mejor.',' El equipo pide resultados inmediatos.'][context];
 return {id:`DAILY_${run.stage}_${slot}`,phase:stage.phase,ageWindow:[stage.from,stage.to],family:['tactical','family','medical','press'][slot],gates:[],cooldown:0,weight:1,text:{title,body:body+situation},intel:{visible:[],uncertain:[]},choices:choices.map(([label],i)=>({id:`c${i}`,label,intentTags:[],outcomeIds:[`o${i}`]})),outcomes:choices.map(([label,effects],i)=>({id:`o${i}`,baseWeight:1,effects:effects.map(([path,delta])=>({kind:'numeric',path,delta,min:0,max:100})),messages:[label+'. Tu elección acompaña el siguiente tramo de la temporada.']}))};
}
function clubOptions(run){
 const first=run.resolved===0,s=run.state;let pool=FOOTBALL_CLUBS.filter(c=>c.id!==s.club&&(first?c.countryCode==='ESP'&&c.tier>=2:c.prestige<=clamp(s.reputation.prestige+s.sport.roleScore*.6+30,35,100)));
 if(pool.length<3)pool=FOOTBALL_CLUBS.filter(c=>c.id!==s.club).sort((a,b)=>a.prestige-b.prestige).slice(0,30);
 const sorted=[...pool].sort((a,b)=>hash(`${run.seed}:${run.stage}:${a.id}`)-hash(`${run.seed}:${run.stage}:${b.id}`));
 return first?sorted.slice(0,3):[clubById.get(s.club),...sorted.slice(0,2)];
}
function predictedRole(state,club){return clamp(Math.round(state.sport.roleScore*.7+state.professional.technique*.2+(50-club.prestige)*.35+8),18,85);}
function prepare(run){
 const stage=STAGES[run.stage],s=run.state;s.phase=stage.phase;
 if(run.resolved%5===0){run.pending={kind:'club',clubs:clubOptions(run).map(c=>({id:c.id,name:c.name,tier:c.tier,prestige:c.prestige,role:predictedRole(s,c),stay:c.id===s.club&&run.resolved>0}))};return;}
 s.runtime.daysSinceNarrative=999;
 const original=null; // Daily uses curated, calendar-safe stories with explicit tradeoffs.
 const event=original?.event??fallbackEvent(run);
 run.pending={kind:'story',event,choices:eligibleChoices(s,event).map(c=>({id:c.id,label:c.label,tradeoff:event.outcomes.find(o=>o.id===c.outcomeIds[0])?.effects.map(e=>`${({'professional.technique':'Técnica','sport.form':'Forma','body.fatigue':'Fatiga','sport.roleScore':'Papel','personality.professionalism':'Profesionalidad','control.career':'Control','body.fitness':'Físico','body.risk':'Riesgo','professional.composure':'Calma','reputation.prestige':'Prestigio'})[e.path]??e.path} ${e.delta>0?'+':''}${e.delta}${e.delta>0&&['professional.technique','body.fitness'].includes(e.path)?' máx.':''}`).join(' · ')})),original:Boolean(original)};
}
export function newDailyRun(config){if(config.rulesVersion===3)return legacy.newDailyRun(config);const run={version:4,strengths:{},competitions:[],seed:config.seed,revision:0,resolved:0,stage:0,finished:false,state:createInitialState(config.seed),pending:null,summaries:[],seasons:[],history:[],lastMessage:'',receipts:[],summaryPending:false};prepare(run);return run;}
function sign(run,id){const c=clubById.get(id),s=run.state,stay=id===s.club;s.club=id;s.tier=c.tier;s.professional.ownerClub=id;s.professional.registrationClub=id;s.professional.leagueTier=c.tier;s.professional.clubPrestigeScore=c.prestige;s.professional.route=c.countryCode==='ESP'?'domestic':'abroad';s.world.ownerClub=id;s.flags.ABROAD_ROUTE=c.countryCode!=='ESP';s.sport.roleScore=predictedRole(s,c);s.role=s.sport.roleScore>=65?'starter':s.sport.roleScore>=40?'rotation':'reserve';s.contract.monthsRemaining=48;s.contract.salaryMonthly=Math.round((500+c.financialPower*100)*(1+s.reputation.prestige/100));run.lastMessage=stay?`Sigues en ${c.name}.`:`Nueva etapa en ${c.name}.`;}
// Advance the entire league without animations or one request per match.
function simulateTo(run,targetAge){
 const s=run.state,target=Date.UTC(2026,6+Math.round((targetAge-18)*12),1),targetDate=new Date(target).toISOString().slice(0,10);
 let year=Number(s.date.slice(0,4))-(s.date.slice(5)<'07-01'?1:0);
 while(`${year}-07-01`<targetDate){
  let season=run.competitions.find(c=>c.year===year);
  if(!season){season=createLeagueSeason({seed:run.seed,year,clubId:s.club,tier:s.professional.leagueTier,route:s.professional.route,strengths:run.strengths});run.competitions.push(season);}
  const cup=createContinentalSeason({seed:run.seed,year,clubId:season.clubId,previousLeague:run.competitions.find(c=>c.year===year-1)});
  advanceContinentalPlayer(season,cup,targetDate,{seed:run.seed,playerState:s,producePlayerStats:playerStatsForFixture});
  advanceLeagueSeason(season,targetDate,{seed:run.seed,playerState:s,producePlayerStats:playerStatsForFixture});
  let row=run.seasons.find(r=>r.season===season.id);
  if(!row){row={season:season.id,club:season.clubId,clubName:clubById.get(season.clubId).name,titles:[],awards:[]};run.seasons.push(row);}
  Object.assign(row,season.player);delete row.matches;for(const key of ['played','starts','goals','assists','minutes','ratingSum'])row[key]+=season.cupPlayer?.[key]??0;row.fixtures=season.teams.find(t=>t.id===season.clubId).played;
  if(season.closed&&!season.strengthsUpdated){run.strengths=evolvingStrengths(season,run.strengths);season.strengthsUpdated=true;const honours=seasonHonours(season);row.titles=honours.titles;row.awards=honours.awards;
   const continental=publicContinentalSeason(createContinentalSeason({seed:run.seed,year,clubId:season.clubId,previousLeague:run.competitions.find(c=>c.year===year-1)}),`${year+1}-06-30`);if(continental.champion&&season.cupPlayer?.played>0)row.titles.push('Champions · formato adaptado');
  }
  if(season.closed&&!season.ageingApplied){season.ageingApplied=true;const age=18+year-2026;s.body.fitness=clamp(s.body.fitness+(age<28?1:age<32?-2:-4),25,95);s.professional.technique=clamp(s.professional.technique+(age<28?1:age>=34?-1:0));s.body.risk=clamp(s.body.risk+(age>=30?2:0));s.body.fatigue=clamp(s.body.fatigue-12);}
  year++;
 }
 s.date=targetDate;s.age=Math.floor(targetAge);s.season=`${year}-${String(year+1).slice(-2)}`;
}
function closeStage(run){
 const stage=STAGES[run.stage],seasons=run.seasons.filter(row=>!row.closed),club=clubById.get(run.state.club);
 for(const row of seasons)row.closed=true;
 const sum=key=>seasons.reduce((n,row)=>n+row[key],0);
 run.summaries.push({from:stage.from,to:stage.to,name:stage.name,club:club.name,played:sum('played'),starts:sum('starts'),goals:sum('goals'),assists:sum('assists'),minutes:sum('minutes'),role:sum('played')?Math.round(sum('starts')/sum('played')*100):0,titles:seasons.flatMap(r=>r.titles.map(title=>({title,season:r.season,club:r.clubName}))),awards:seasons.flatMap(r=>r.awards.map(title=>({title,season:r.season,club:r.clubName})))});
 run.summaryPending=true;run.pending=null;
 if(run.resolved===30){run.finished=true;run.state.retirement.status='closed';}else run.stage++;
}
export function applyDailyCommand(run,command){
 if(run.version===3)return legacy.applyDailyCommand(run,command);
 if(!command||typeof command.commandId!=='string'||command.commandId.length>100||!command.commandId.length)throw new CareerError(400,'Acción Daily inválida.');
 const fingerprint=JSON.stringify({type:command.type,choiceId:command.choiceId,expectedRevision:command.expectedRevision});
 const receipt=run.receipts.find(r=>r.id===command.commandId);if(receipt){if(receipt.fingerprint!==fingerprint)throw new CareerError(409,'La acción ya se utilizó con otra elección.');return run;}
 if(command.expectedRevision!==run.revision)throw new CareerError(409,'El reto cambió en otra sesión. Recupera tu intento.');
 if(command.type==='acknowledge'&&run.summaryPending&&!run.finished){run.summaryPending=false;prepare(run);}
 else if(command.type==='choose'&&!run.finished&&!run.summaryPending){
  const pending=run.pending;
  if(pending.kind==='club'){
   if(!pending.clubs.some(c=>c.id===command.choiceId))throw new CareerError(400,'Ese equipo no está disponible.');sign(run,command.choiceId);
   run.history.push({age:run.state.age,title:'Elegir equipo',choice:run.lastMessage,original:false});run.resolved++;
  }else{
   const choice=pending.choices.find(c=>c.id===command.choiceId);if(!choice)throw new CareerError(400,'Esa decisión no está disponible.');
   const beforeTechnique=run.state.professional.technique,beforeFitness=run.state.body.fitness;
   const result=resolveChoiceInPlace(run.state,pending.event,choice.id);
   for(const [target,key,before] of [[run.state.professional,'technique',beforeTechnique],[run.state.body,'fitness',beforeFitness]])if(target[key]>before)target[key]=before+(target[key]-before)*Math.max(.15,1-before/110);
   run.state.role=run.state.sport.roleScore>=65?'starter':run.state.sport.roleScore>=40?'rotation':'reserve';run.lastMessage=playerFacingMessages(result.messages).join(' ');
   run.history.push({age:run.state.age,title:pending.event.text.title,choice:choice.label,original:pending.original});run.resolved++;
   const stage=STAGES[run.stage],fraction=(run.resolved%5||5)-1;simulateTo(run,stage.from+(stage.to-stage.from)*fraction/4);
  }
  if(run.resolved%5===0)closeStage(run);else prepare(run);
 }else throw new CareerError(400,'Acción Daily no disponible.');
 run.revision++;run.receipts.push({id:command.commandId,fingerprint});return run;
}
export function dailyRunView(run,seasonId){
 if(run.version===3)return legacy.dailyRunView(run,seasonId);
 const selected=run.competitions.find(c=>c.id===seasonId)??run.competitions.at(-1);
 const s=run.state,p=run.pending,stage=STAGES[Math.min(run.summaryPending&&!run.finished?run.stage-1:run.stage,5)],totals={played:0,starts:0,goals:0,assists:0};for(const season of run.seasons)for(const key of Object.keys(totals))totals[key]+=season[key];
 return {seasons:run.competitions.map(c=>({id:c.id,club:clubById.get(c.clubId).name,division:c.division})),league:selected?publicLeagueSeason(selected):null,continental:selected?publicContinentalSeason(createContinentalSeason({seed:run.seed,year:selected.year,clubId:selected.clubId,previousLeague:run.competitions.find(c=>c.year===selected.year-1)}),s.date):null,revision:run.revision,age:Math.floor(s.age),club:clubById.get(s.club)?.name??'Sin equipo',form:Math.round(s.sport.form),fitness:Math.round(s.body.fitness),technique:Math.round(s.professional.technique),fatigue:Math.round(s.body.fatigue),risk:Math.round(s.body.risk),role:s.role,stage,nextStage:run.summaryPending&&!run.finished?STAGES[run.stage]:null,screen:run.finished?'epilogue':run.summaryPending?'summary':p.kind==='club'?'club':'decision',clubs:p?.clubs,decision:p?.kind==='story'?{title:p.event.text.title,body:p.event.text.body,choices:p.choices,original:p.original}:null,lastMessage:run.lastMessage,summary:run.summaries.at(-1),summaries:run.summaries,totals,titles:run.summaries.flatMap(r=>r.titles),awards:run.summaries.flatMap(r=>r.awards),history:run.finished?run.history:undefined};
}
export function dailyScore(state,run){
 if(run?.version===3)return legacy.dailyScore(state,run);
 const clampValue=n=>clamp(Number.isFinite(n)?n:0);
 const totals=run?.seasons??[],played=totals.reduce((n,s)=>n+s.played,0),minutes=totals.reduce((n,s)=>n+s.minutes,0),rating=totals.reduce((n,s)=>n+s.ratingSum,0),available=(run?.competitions??[]).reduce((n,c)=>n+c.player.matches.length+(c.cupPlayer?.matches.length??0),0);
 const parts=[['Rendimiento en partidos',played?clamp((rating/played-4)/4.5*100):0,30],['Participación deportiva',available?clamp(minutes/(available*90)*100):0,20],['Estado físico',state.body.fitness-state.body.risk*.15,10],['Técnica',state.professional.technique,15],['Profesionalidad',state.personality.professionalism,15],['Control de carrera',state.control.career,10]];
 const breakdown=parts.map(([label,value,weight])=>({label,value:clampValue(value),weight,points:Math.round(clampValue(value)*weight/10)}));
 return {total:Math.min(1000,breakdown.reduce((n,p)=>n+p.points,0)),breakdown};
}
