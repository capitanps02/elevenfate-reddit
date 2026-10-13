import { createCutscenePlayer } from './cutscene-player.js';
import { formatClubName } from './club-names.js';
import { createIndexedSaveStore } from './indexed-save-store.js';
// UI reads PlayerView only. All career mutations go through GameSession commands.
export function mountGame({root, GameSession, assets, css, storageKey='historia-jugador.preview.session.v1', events, saveStore, cutsceneFactory=createCutscenePlayer, saveDescription='local', compactHome=false, onDaily, careerSports, cutsceneUrl=clip=>'/web/assets/cutscenes/'+clip.file, initialView='home', autoCreateOnLoad=true, deferAutoResume=false, onMenu, presentationLocale}) {
  const KEY=storageKey;
  let session=null, busy=false, busyLabel='Guardando…', paused=false, platformSuspended=false, view=['home','career','world','relations','profile','save','new'].includes(initialView)?initialView:'home', cinematic=false, message='', replacement=null, lastArt='stadium_bg', autoTimer=null, autoVisualTimer=null, lastAutoVisualAt=0;
  const AUTO_VISUAL_MIN_MS=280;
  let savedRaw=null, disposeCutscene=null, disposed=false;
  let autoResumeAllowed=!deferAutoResume;
  let profileNameDraft=null;
  let newStoryDraft={displayName:'',seed:'424242'};
  let busyKind='write',newStoryAdvancedOpen=false,activeDialogLocale=null;
  const copy=(id,fallback,parameters={})=>presentationLocale?presentationLocale.t(id,parameters):fallback;
  const locale=()=>presentationLocale?.getLocale()||'es';
  const busyCopy=()=>copy(({'Guardando…':'career.busy.save','Cargando…':'career.busy.load','Comprobando la copia…':'career.busy.checkCopy','Guardando tu historia…':'career.busy.saveStory','Comprobando tu partida…':'career.busy.checkCareer','Creando tu carrera…':'career.busy.create'})[busyLabel],busyLabel);
  function messageCopy(){
    if(locale()==='es')return message;
    const id=({'Introduce el nombre del jugador para empezar otra carrera.':'career.new.nameRequired','Introduce un código de historia entre 0 y 4294967295.':'career.new.codeInvalid','No se ha podido cargar el juego. Comprueba tu conexión o almacenamiento e inténtalo de nuevo. Tu copia guardada se conserva.':'career.loadError','Otra pestaña ha cambiado la copia antigua. Puedes descargarla en Tu partida para revisarla antes de importar.':'career.legacyChanged'})[message];
    const recoveryId={"Carrera eliminada. Puedes empezar otra cuando quieras.": "career.save.deleted", "No hay una partida guardada.": "career.save.noSave", "No hay copia anterior.": "career.save.noPrevious", "La copia supera 8 MiB.": "career.save.tooLarge", "Recupera la partida guardada antes de continuar.": "career.save.revision", "La carrera cambió en otro dispositivo. Recupera la partida actual antes de continuar.": "career.save.conflict", "No se pudo confirmar el guardado en Reddit. Comprueba la conexión y recupera la partida actual.": "career.save.connection"};
    if(message.startsWith('No se pudo importar. '))return copy(message==='No se pudo importar. La copia supera 8 MiB.'?'career.save.tooLarge':'career.save.importError',message);
    return copy(id||recoveryId[message]||'career.genericError',message);
  }
  function resumeLoadedSimulation(){autoResumeAllowed=true;queueAutoStep();render();}
  const watchedKey=KEY+'.watched-cutscenes.v1';
  let watchedScenes=new Set();
  try{const items=JSON.parse(localStorage.getItem(watchedKey)||'[]');if(Array.isArray(items))watchedScenes=new Set(items.filter(x=>typeof x==='string'));}catch{}
  function appendCutscene(v,target){
    if(!v.cutscene)return;
    const sceneKey=[v.sessionId,v.cutscene.file,v.screen,v.decisionsMade].join(':');
    const posterKey=v.cutscene.eventId==='PROLOGUE'?'hero_player':v.cutscene.eventId==='EPILOGUE'?'stadium_bg':lastArt;
    const player=cutsceneFactory({document:doc,clip:v.cutscene,url:cutsceneUrl(v.cutscene),posterUrl:assets[posterKey]||assets.stadium_bg||assets.prematch_scene||null,autoplay:!watchedScenes.has(sceneKey),onStarted(){watchedScenes.add(sceneKey);try{localStorage.setItem(watchedKey,JSON.stringify([...watchedScenes].slice(-512)));}catch{}}});
    if(player){player.element.dataset.cutsceneKind=v.cutscene.eventId==='PROLOGUE'?'prologue':v.cutscene.eventId==='EPILOGUE'?'epilogue':'event';target.append(player.element);disposeCutscene=player.dispose;}
  }
  let playerActionUi={screen:'career',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};

  const sessionOptions={redditCompetitions:compactHome,...(events?{events}:{})};
  const store=saveStore||createIndexedSaveStore({storage:localStorage,indexedDB:globalThis.indexedDB,key:KEY,validate:raw=>GameSession.migrateFromSave(raw,sessionOptions)});
  const doc=root.ownerDocument, win=doc.defaultView||globalThis, el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  doc.title='ELEVENFATE';
  const style=el('style');style.textContent=css;root.append(style);
  const shell=el('div',undefined,'mh'+(compactHome?' reddit-shell':''));shell.dataset.release='2026-09-28-cinematicas-prologo';root.append(shell);
  let dateFormatter=new Intl.DateTimeFormat(locale()==='en'?'en-GB':'es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  let moneyFormatter=new Intl.NumberFormat(locale()==='en'?'en-GB':'es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
  let decimalFormatter=new Intl.NumberFormat(locale()==='en'?'en-GB':'es-ES',{maximumFractionDigits:1});
  const date=s=>dateFormatter.format(new Date(s+'T00:00:00Z'));
  const decisionCount=n=>locale()==='en'?`${n} ${n===1?'decision':'decisions'}`:`${n} ${n===1?'decisión':'decisiones'}`;
  const hasBackup=()=>store.hasPrevious();
  const money=n=>moneyFormatter.format(n);
  const clubName=formatClubName;
  const decimal=n=>decimalFormatter.format(n);
  const deltaText=n=>{const rounded=Math.round(n*10)/10;return rounded===0&&n!==0?(n>0?'+':'−')+'<0,1':(rounded>0?'+':'')+decimal(rounded);};
  function autoSimulationProgress(v){
    const maxWeeks=Number(v?.simulation?.maxWeeks),elapsedRaw=Number(v?.simulation?.elapsedDays);
    if(!Number.isInteger(maxWeeks)||maxWeeks<=0||!Number.isFinite(elapsedRaw))return null;
    const totalDays=maxWeeks*7,elapsedDays=Math.min(totalDays,Math.max(0,elapsedRaw));
    if(totalDays<=0)return null;
    return {elapsedDays,totalDays,percent:Math.min(100,Math.max(0,elapsedDays/totalDays*100))};
  }
  const club=v=>clubName(v.club);
  const position=v=>{const labels={winger:'Extremo',midfielder:'Centrocampista',striker:'Delantero',defender:'Defensa',goalkeeper:'Portero'};return copy('career.position.'+(Object.hasOwn(labels,v.position)?v.position:'other'),labels[v.position]||'Futbolista');};
  const svgPaths={home:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',career:'M5 3h14v18H5z M8 8h8M8 12h8M8 16h5',world:'M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18 M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18',relations:'M2 21c0-9 13-9 13 0M15 14c4-1 7 2 7 6 M8.5 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8 M17 5a3 3 0 0 1 0 6',profile:'M4 21c0-10 16-10 16 0 M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8',save:'M4 3h14l3 3v15H3V3h1 M7 3v7h10V3M7 21v-7h10v7',arrow:'M4 12h15M14 6l6 6-6 6','pa-training':'M7 8v8M17 8v8M4 10v4M20 10v4M7 12h10','pa-health':'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z','pa-representative':'M4 8h16v11H4z M9 8V5h6v3 M4 12h16 M10 12v2h4v-2','pa-image':'M4 7h4l2-2h4l2 2h4v12H4z M12 10a4 4 0 1 0 0 8 4 4 0 1 0 0-8','pa-life':'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18 M12 7v5l3 2'};
  function icon(name){const key=svgPaths[name]?name:'arrow';const s=doc.createElementNS('http://www.w3.org/2000/svg','svg');s.classList.add('muir-icon');s.dataset.icon=key;s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');const p=doc.createElementNS(s.namespaceURI,'path');p.setAttribute('d',svgPaths[key]);s.append(p);return s;}
  function button(text,fn,cls='secondary',options={}){const b=el('button',undefined,cls);b.type='button';b.append(el('span',text));b.disabled=busy||options.disabled===true||(paused&&options.blockedWhenPaused===true);if(options.allowDuringRead&&!autoCreateOnLoad&&busyKind==='read'&&options.disabled!==true&&!(paused&&options.blockedWhenPaused===true))b.disabled=false;if(options.localeFocus)b.dataset.localeFocus=options.localeFocus;if(options.ariaLabel)b.setAttribute('aria-label',options.ariaLabel);if(options.pressed!==undefined)b.setAttribute('aria-pressed',String(options.pressed));b.addEventListener('click',fn);return b;}
  function photo(name,cls='photo'){const img=el('img',undefined,cls);img.src=assets[name]||assets.stadium_bg;img.alt='';img.draggable=false;return img;}
  function panel(title){const p=el('article',undefined,'panel');p.append(el('h2',title));return p;}
  function semanticRow(label,value,cls='data-row'){
    if(value===undefined||value===null||value==='')return null;
    const row=el('div',undefined,cls);row.append(el('span',label),el('strong',String(value)));return row;
  }
  function appendSemanticRows(target,rows){for(const [label,value] of rows){const row=semanticRow(label,value);if(row)target.append(row);}return target;}
  function seasonText(value){const raw=String(value??'').trim();return raw?raw.replace('-',' / 20'):'';}
  function initials(name){return String(name??'').trim().split(/\s+/).filter(Boolean).map(part=>part.match(/\p{L}/u)?.[0]).filter(Boolean).slice(0,2).join('').toLocaleUpperCase('es-ES');}
  function newsCard(item){
    if(!item||!item.date||!item.text)return null;
    const card=el('article',undefined,'panel semantic-card news-card');
    card.setAttribute('aria-label',copy('career.world.newsDate','Noticia del '+date(item.date),{date:date(item.date)}));
    card.append(el('time',date(item.date),'eyebrow'),el('p',item.text,'news-copy'));
    return card;
  }
  function latestMatchCard(m,{empty=false}={}){
    if(!m){
      if(!empty)return null;
      const p=panel(copy('career.record.latest','Último partido oficial'));p.classList.add('semantic-card','latest-match-card','semantic-empty');
      p.append(el('p',copy('career.record.noLatest','Todavía no hay un último partido oficial registrado.'),'muted'));return p;
    }
    const p=panel(copy('career.record.latest','Último partido oficial'));p.classList.add('semantic-card','latest-match-card');p.append(el('time',date(m.date),'eyebrow'));
    const home=m.homeAway==='home'?clubName(m.club):clubName(m.opponent),away=m.homeAway==='home'?clubName(m.opponent):clubName(m.club);
    p.append(el('p',m.result?`${home} ${m.result.homeGoals} – ${m.result.awayGoals} ${away}`:`${home} · ${away}`,'season-club semantic-club-name'));
    const participation=!m.available?copy('career.record.notAvailable','No disponible para este partido'):!m.selected?copy('career.record.notSelected','No convocado'):m.minutes===0?copy('career.record.noMinutes','Suplente sin minutos'):m.started?copy('career.record.starter','Titular'):copy('career.record.substitute','Entraste desde el banquillo');
    p.append(el('p',participation,'muted'));
    const rows=[[copy('career.record.competition','Competición'),m.competition==='league'?copy('career.record.league','Liga'):null],[copy('career.record.minutes','Minutos'),Number.isFinite(m.minutes)?m.minutes:null],[copy('career.record.goals','Goles'),Number.isFinite(m.goals)?m.goals:null],[copy('career.record.assists','Asistencias'),Number.isFinite(m.assists)?m.assists:null],[copy('career.record.rating','Valoración'),typeof m.rating==='number'?decimal(m.rating):null]];
    appendSemanticRows(p,rows);
    const labels={first_call_up:copy('career.record.first_call_up','primera convocatoria'),first_bench:copy('career.record.first_bench','primera suplencia'),debut:copy('career.record.matchDebut','debut'),first_start:copy('career.record.first_start','primera titularidad'),first_full_match:copy('career.record.first_full_match','primer partido completo'),first_goal:copy('career.record.first_goal','primer gol'),first_assist:copy('career.record.first_assist','primera asistencia')};
    const milestones=(m.milestones??[]).map(x=>labels[x]||(/^appearance_\d+$/.test(x)?copy('career.record.matchNumber',x.replace('appearance_','partido nº '),{number:x.slice('appearance_'.length)}):null)).filter(Boolean);
    if(milestones.length)p.append(el('p',copy('career.record.matchMilestones','Hitos: '+milestones.join(' · '),{items:milestones.join(' · ')}),'career-milestone'));
    return p;
  }
  function careerSeasonCard(s){
    if(!s||!s.season)return null;
    const p=panel(copy('career.record.season','Temporada '+seasonText(s.season),{season:seasonText(s.season)}));p.classList.add('semantic-card','career-season-card');
    const clubLabel=clubName(s.club);if(clubLabel)p.append(el('p',clubLabel,'season-club semantic-club-name'));
    appendSemanticRows(p,[[copy('career.record.matches','Partidos'),Number.isFinite(s.appearances)?s.appearances:null],[copy('career.record.starts','Titularidades'),Number.isFinite(s.starts)?s.starts:null],[copy('career.record.minutes','Minutos'),Number.isFinite(s.minutes)?s.minutes:null],[copy('career.record.goals','Goles'),Number.isFinite(s.goals)?s.goals:null],[copy('career.record.assists','Asistencias'),Number.isFinite(s.assists)?s.assists:null],[copy('career.record.average','Valoración media'),typeof s.averageRating==='number'?decimal(s.averageRating):null]]);
    return p;
  }
  function contractSummary(v,{compact=false}={}){
    const p=panel(copy('career.contract.title','Tu contrato'));p.classList.add('semantic-card','contract-summary');
    if(!compact){
      const clubLabel=clubName(v?.club);if(clubLabel)p.append(semanticRow(copy('career.contract.club','Club'),clubLabel));
      if(Number.isFinite(v?.salaryMonthly))p.append(semanticRow(copy('career.contract.salary','Salario mensual'),money(v.salaryMonthly)));
    }
    const months=Number(v?.contractMonths);
    if(Number.isFinite(months))p.append(semanticRow(copy('career.contract.remaining','Duración restante'),months>0?copy(Math.ceil(months)===1?'career.contract.monthOne':'career.contract.months',Math.ceil(months)+(Math.ceil(months)===1?' mes':' meses'),{months:Math.ceil(months)}):copy('career.contract.expired','Sin meses de contrato restantes')));
    if(months>0&&months<=6)p.append(el('p',copy('career.contract.ending','El contrato está en su tramo final.'),'muted'));
    return p;
  }
  function offerTermValue(key,value){
    if(key==='club'||key==='ownerClub'||key==='registrationClub')return value?clubName(value):null;
    if(key==='leagueTier')return Number.isFinite(value)?'Categoría '+value:null;
    if(key==='salary')return Number.isFinite(value)?money(value):null;
    if(key==='months')return Number.isFinite(value)?value+' meses':null;
    if(key==='releaseClause')return value===null?'Sin cláusula':Number.isFinite(value)?money(value):null;
    return null;
  }
  function offerCard(o,{actions=null,explanation=null,delegateHelp=false}={}){
    if(!o?.reason)return null;
    const p=panel(o.reason);p.classList.add('semantic-card','offer-card');
    if(o.date)p.prepend(el('time',date(o.date),'eyebrow'));
    const specs=[['Club','club'],['Club propietario','ownerClub'],['Categoría','leagueTier'],['Salario mensual','salary'],['Duración','months'],['Cláusula','releaseClause']];
    if(o.before&&o.terms){
      for(const [label,key] of specs){
        const before=offerTermValue(key,o.before[key]),after=offerTermValue(key,o.terms[key]);
        if(before===null&&after===null)continue;
        const row=semanticRow(label,(before??'')+' → '+(after??''),'data-row offer-comparison');if(row)p.append(row);
      }
      if(o.before.loan||o.terms.loan){
        const before=offerTermValue('registrationClub',o.before.registrationClub),after=offerTermValue('registrationClub',o.terms.registrationClub);
        const row=semanticRow('Club de inscripción',(before??'')+' → '+(after??''),'data-row offer-comparison');if(row)p.append(row);
      }
      p.append(el('p',o.terms.loan?'La propuesta es una cesión.':'La propuesta no es una cesión.','muted offer-loan-state'));
    }
    if(explanation)p.append(el('p',explanation,'story-text'));
    if(delegateHelp)p.append(el('p','Si delegas esta oferta, tu representante solo aceptará si no baja el salario ni la categoría y asegura al menos 12 meses. La delegación termina con esta respuesta.','story-text'));
    if(actions){
      const choices=el('div',undefined,'choices');
      for(const [action,label] of actions)choices.append(button(label,()=>run('offer',{offerId:o.id,action}),'choice',{blockedWhenPaused:true}));
      p.append(choices);
    }
    return p;
  }
  function personCard(c,{compact=false}={}){
    if(!c?.name)return null;
    const portraitKey=portrait(c.id);
    if(compact){
      const row=el('div',undefined,'contact-row semantic-card person-card person-card-compact');
      row.append(portraitKey?photo(portraitKey,'avatar'):el('div',initials(c.name)||'·','avatar initials person-initials'));
      const info=el('div',undefined,'person-copy');info.append(el('strong',c.name));if(c.role)info.append(el('p',c.role,'muted'));row.append(info);return row;
    }
    const p=panel(c.name);p.classList.add('semantic-card','person-card');
    p.prepend(portraitKey?photo(portraitKey,'person-portrait'):el('div',initials(c.name)||'·','initials person-initials'));
    if(c.role)p.append(el('p',c.role,'muted'));return p;
  }
  function milestoneCard(title,{dateValue=null,summary=null,chips=[],rows=[]}={}){
    const p=panel(title);p.classList.add('semantic-card','milestone-card');
    if(dateValue){const t=el('time',date(dateValue),'eyebrow');t.dateTime=dateValue;p.prepend(t);}
    if(summary)p.append(el('p',summary,'milestone-summary'));
    if(chips.length){const list=el('div',undefined,'milestone-list');for(const label of chips)list.append(el('span',label,'milestone-chip'));p.append(list);}
    appendSemanticRows(p,rows);
    return p;
  }
  const validViews=new Set(['home','career','world','relations','profile','save','new']);
  let historyReady=false;
  function routeState(){return {mhOwner:true,mhView:view,mhCinematic:cinematic,...(onMenu?{efEntry:'career'}:{})};}
  function replaceRouteState(){if(win.history?.replaceState)win.history.replaceState(routeState(),'');}
  function prepareHistory(){if(historyReady||!win.history?.replaceState)return;const initialCinematic=cinematic;win.history.replaceState({...routeState(),mhCinematic:false},'');historyReady=true;if(initialCinematic)win.history.pushState(routeState(),'');}
  function navigate(name){view=validViews.has(name)?name:'home';cinematic=false;message='';playerActionUi={screen:'career',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};if(historyReady)win.history.pushState(routeState(),'');else prepareHistory();render(true);}
  function openCinematic(){if(!session)return;cinematic=true;if(historyReady)win.history.pushState(routeState(),'');else prepareHistory();render(true);}
  function closeCinematic(){if(historyReady&&win.history.state?.mhOwner&&win.history.state.mhCinematic){win.history.back();return;}cinematic=false;view='home';replaceRouteState();render(true);}
  function canLeaveEntry(){return !shell.querySelector('dialog[open]')&&(!busy||(!autoCreateOnLoad&&busyKind==='read'));}
  function requestMenu(){if(onMenu&&canLeaveEntry()){suspendAutoScheduler();onMenu();}}
  function goBack(){
    if(onMenu&&view==='new'){requestMenu();return;}
    if(cinematic){closeCinematic();return;}
    if(playerActionUi.screen!=='career'){
      if(playerActionUi.screen==='player_action_result'||playerActionUi.screen==='player_action_detail')playerActionUi={screen:'player_action_category',categoryId:playerActionUi.categoryId,actionId:null,targetId:null,resultExecutionId:null};
      else if(playerActionUi.screen==='player_action_category')playerActionUi={screen:'player_action_menu',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};
      else playerActionUi={screen:'career',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};
      render(true);return;
    }
    if(historyReady&&win.history.state?.mhOwner&&view!=='home'){win.history.back();return;}
    if(view!=='home'){view='home';replaceRouteState();render(true);return;}
    if(onMenu)requestMenu();
  }
  async function pauseToggle(){
    if(!session||busy)return;
    const mode=session.getView().simulation?.mode;
    if(mode==='auto_simulating'){clearTimeout(autoTimer);await run('auto',{action:'pause'});return;}
    if(mode==='paused'){await run('auto',{action:'resume'});return;}
    paused=!paused;render();
  }
  async function commit(next,previous){
    if(previous){const current=savedRaw&&JSON.parse(savedRaw);if(!current||current.sessionId!==previous.sessionId||current.revision!==previous.revision)throw Error('Recupera la partida guardada antes de continuar.');}
    await store.write(next,previous?savedRaw:replacement);
    savedRaw=JSON.stringify(next);
  }
  async function load(){
    if(busy)return;busy=true;busyKind='read';busyLabel='Cargando…';message='';render();
    try{const raw=await store.read();if(disposed)return;savedRaw=raw;if(raw){session=await GameSession.migrateFromSave(raw,{...sessionOptions,commit});cinematic=!compactHome&&['decision','result','offer'].includes(session.getView().screen);}else{replacement=null;if(autoCreateOnLoad)session=await GameSession.create(424242,{...sessionOptions,commit});else{session=null;if(view!=='new')view='save';}}prepareHistory(); if(await store.legacyChanged())message='Otra pestaña ha cambiado la copia antigua. Puedes descargarla en Tu partida para revisarla antes de importar.'; }
    catch(e){console.error('ELEVENFATE load failed',e);session=null;message='No se ha podido cargar el juego. Comprueba tu conexión o almacenamiento e inténtalo de nuevo. Tu copia guardada se conserva.';view='save';}
    finally{busy=false;if(!disposed){render(Boolean(onMenu));queueAutoStep();}}
  }
  function suspendAutoScheduler(){
    clearTimeout(autoTimer);autoTimer=null;
    if(autoVisualTimer!==null){clearTimeout(autoVisualTimer);autoVisualTimer=null;}
  }
  function queueAutoStep(){
    clearTimeout(autoTimer);
    autoTimer=null;
    if(!autoResumeAllowed||!session||paused||platformSuspended||doc.visibilityState==='hidden'||session.getView().simulation?.mode!=='auto_simulating')return;
    autoTimer=setTimeout(()=>{
      autoTimer=null;
      if(!platformSuspended&&doc.visibilityState!=='hidden'&&!busy&&!paused&&session?.getView().simulation?.mode==='auto_simulating')run('auto',{action:'step'});
    },140);
  }
  function visibilitychange(){
    if(doc.visibilityState==='hidden'){suspendAutoScheduler();return;}
    if(!platformSuspended)queueAutoStep();
  }
  function platformpause(){
    platformSuspended=true;suspendAutoScheduler();shell.dataset.platformSuspended='true';
    const revision=session?.getView?.().revision;if(Number.isInteger(revision))shell.dataset.platformPauseRevision=String(revision);
  }
  function platformresume(){
    const revision=session?.getView?.().revision;if(Number.isInteger(revision))shell.dataset.platformResumeRevision=String(revision);
    shell.dataset.platformSuspended='false';platformSuspended=false;if(doc.visibilityState!=='hidden')queueAutoStep();
  }
  function patchAutoPresentation(){
    autoVisualTimer=null;
    const v=session?.getView();
    if(platformSuspended||doc.visibilityState==='hidden'||!v||view!=='home'||cinematic||v.simulation?.mode!=='auto_simulating')return false;
    const progress=autoSimulationProgress(v);
    const dateButton=shell.querySelector('.date-button span');
    if(dateButton)dateButton.textContent=copy('career.header.saveDate',date(v.date)+' · Partida',{date:date(v.date)});
    for(const currentDate of shell.querySelectorAll('[data-p5-auto-date]'))currentDate.textContent=date(v.date);
    const progressBar=shell.querySelector('[data-p5-auto-progress]');
    const progressText=shell.querySelector('[data-p5-auto-progress-text]');
    if(progress&&progressBar){
      progressBar.max=progress.totalDays;
      progressBar.value=progress.elapsedDays;
      progressBar.setAttribute('aria-label',copy('career.home.progressA11y',`Progreso de la simulación: ${progress.elapsedDays} de ${progress.totalDays} días, ${Math.round(progress.percent)} %`,{elapsed:progress.elapsedDays,total:progress.totalDays,percent:Math.round(progress.percent)}));
    }
    if(progress&&progressText)progressText.textContent=copy('career.home.progress',`${progress.elapsedDays} de ${progress.totalDays} días · ${Math.round(progress.percent)} %`,{elapsed:progress.elapsedDays,total:progress.totalDays,percent:Math.round(progress.percent)});
    lastAutoVisualAt=performance.now();
    return true;
  }
  function scheduleAutoPresentation(){
    if(autoVisualTimer!==null||platformSuspended||doc.visibilityState==='hidden')return;
    const v=session?.getView();
    if(!v||v.simulation?.mode!=='auto_simulating'||view!=='home'||cinematic)return;
    const wait=Math.max(0,AUTO_VISUAL_MIN_MS-(performance.now()-lastAutoVisualAt));
    if(wait===0){patchAutoPresentation();return;}
    autoVisualTimer=setTimeout(()=>patchAutoPresentation(),wait);
  }
  async function run(type,extra={},onSuccess){
    if(busy||!session)return;
    if(type==='auto'&&['start','resume'].includes(extra.action))autoResumeAllowed=true;
    if(type==='auto'&&extra.action==='pause')clearTimeout(autoTimer);
    const command={type,commandId:crypto.randomUUID(),expectedRevision:session.getView().revision,...extra};
    const quietAutoStep=type==='auto'&&extra.action==='step';
    const viewBefore=view;
    const screenBefore=session.getView().screen;
    let completed=false;
    busy=true;busyKind='write';busyLabel='Guardando…';message='';
    if(!quietAutoStep)render();
    try{
      const wasCinematic=cinematic;
      await session.dispatch(command);
      completed=true;
      if(onSuccess)onSuccess(session.getView());
      cinematic=['decision','result','offer'].includes(session.getView().screen);
      if(type==='player_action'){
        view='career';
        cinematic=false;
        replaceRouteState();
      }else if(type==='identity'){
        profileNameDraft=null;view='profile';
        cinematic=false;
        replaceRouteState();
      }else{
        view='home';
        if(cinematic&&!wasCinematic){if(historyReady)win.history.pushState(routeState(),'');else prepareHistory();}
        else if(!cinematic)replaceRouteState();
      }
    }
    catch(e){
      clearTimeout(autoTimer);
      if(type==='auto'&&['start','step'].includes(extra.action)&&session?.getView().simulation?.mode==='auto_simulating'){
        try{await session.dispatch({type:'auto',action:'pause',commandId:crypto.randomUUID(),expectedRevision:session.getView().revision});}catch{}
      }
      if(e?.code==='STALE_REVISION')message='La situación de tu carrera ha cambiado. La pantalla se ha actualizado; vuelve a intentarlo.';
      else if(type==='player_action')message=e?.message||'Esta acción ya no está disponible.';
      else if(type==='identity')message=e?.message||'No se pudo guardar el nombre del jugador.';
      else message=e.message+' La simulación se ha detenido en el último estado válido; puedes reintentar desde Tu partida.';
    }
    finally{
      busy=false;
      const latest=session?.getView();
      const normalAutoTick=completed&&quietAutoStep&&viewBefore==='home'&&!cinematic&&latest?.screen==='career'&&latest?.simulation?.mode==='auto_simulating';
      if(normalAutoTick)scheduleAutoPresentation();
      else render(true);
      if(completed && type==='acknowledge' && screenBefore==='result' && latest?.screen==='career' && !platformSuspended){
        try{win.AndroidBridge?.naturalBreak?.();}catch{}
      }
      if(completed)queueAutoStep();
    }
  }
  const PLAYER_ACTION_CATEGORY_COPY=()=>({
    career:copy('actions.help.career','Habla con entrenador, representante o club cuando el sistema lo permita.'),
    training:copy('actions.help.training','Trabaja aspectos concretos de tu preparación.'),
    representative:copy('actions.help.representative','Consulta y gestiona tu relación con la representación.'),
    relationships:copy('actions.help.relationships','Interactúa voluntariamente con personas de tu carrera.'),
    image:copy('actions.help.image','Gestiona tu exposición pública cuando haya opciones disponibles.'),
    life:copy('actions.help.life','Descanso y decisiones personales fuera del campo.'),
    health:copy('actions.help.health','Recuperación y cuidado personal cuando estén disponibles.')
  });
  const PLAYER_ACTION_CATEGORY_ICONS={career:'career',training:'pa-training',health:'pa-health',representative:'pa-representative',relationships:'relations',image:'pa-image',life:'pa-life'};
  function resetPlayerActions(){playerActionUi={screen:'career',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};}
  function cooldownText(v,a){
    if(!a?.cooldownUntil)return '';
    return copy('actions.ui.cooldown','Disponible de nuevo el '+date(a.cooldownUntil)+'.',{date:date(a.cooldownUntil)});
  }
  function playerActionStatus(source){
    if(source?.available)return {label:copy('actions.ui.available','Disponible'),state:'available'};
    if(source?.cooldownUntil)return {label:copy('actions.ui.cooldownState','Cooldown activo'),state:'cooldown'};
    return {label:copy('actions.ui.unavailable','No disponible'),state:'unavailable'};
  }
  function playerActionStatusNode(source){
    const status=playerActionStatus(source),node=el('span',status.label,'player-action-status');
    node.dataset.state=status.state;
    return node;
  }
  function appendPlayerActionAvailability(container,v,source,fallback=copy('actions.ui.notNow','Ahora mismo no está disponible.')){
    container.append(playerActionStatusNode(source));
    if(source?.available)return;
    const cooldown=cooldownText(v,source);
    if(cooldown)container.append(el('p',cooldown,'player-action-cooldown'));
    const duplicateCooldownReason=Boolean(source?.cooldownUntil&&source?.unavailableReason?.includes(source.cooldownUntil));
    if(source?.unavailableReason&&!duplicateCooldownReason)container.append(el('p',source.unavailableReason,'player-action-reason'));
    else if(!cooldown)container.append(el('p',fallback,'player-action-reason'));
  }
  function selectedPlayerAction(v){for(const c of v.actions?.categories??[]){const a=c.actions.find(row=>row.id===playerActionUi.actionId);if(a)return a;}return null;}
  function openPlayerActions(){const v=session?.getView();if(!v||v.screen!=='career'||v.simulation?.mode!=='idle'||!v.actions?.available)return;view='career';cinematic=false;playerActionUi={screen:'player_action_menu',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};render(true);}
  function renderPlayerActions(v,main){
    if(v.screen!=='career'||v.simulation?.mode!=='idle'||!v.actions?.available){resetPlayerActions();return false;}
    if(presentationLocale?.presentPlayerActions){try{v={...v,actions:presentationLocale.presentPlayerActions(v.actions)};}catch(error){if(error.code!=='MISSING_PLAYER_ACTION_TRANSLATION')throw error;const notice=el('p',copy('actions.ui.translationPending','Estas acciones están disponibles en Español. Cambia el idioma para verlas.'));notice.setAttribute('role','status');main.append(el('h1',copy('career.record.manage','Gestionar mi carrera')),notice,button(copy('actions.ui.backCareer','Volver a carrera'),()=>{resetPlayerActions();render(true);}));return true;}}
    if(playerActionUi.screen==='player_action_menu'){
      main.append(el('span',copy('actions.ui.eyebrow','GESTIONAR MI CARRERA'),'eyebrow'),el('h1',copy('actions.ui.question','¿Qué quieres hacer?')),el('p',copy('actions.ui.intro','Opcional: entra sólo si quieres hacer algo antes de simular.'),'muted'));
      const grid=el('div',undefined,'player-action-grid');
      for(const c of v.actions.categories){
        const p=panel(c.label);p.classList.add('player-action-card','player-action-category-card');
        const heading=p.querySelector('h2');if(heading){heading.classList.add('player-action-category-title');heading.prepend(icon(PLAYER_ACTION_CATEGORY_ICONS[c.id]||'career'));}
        p.append(el('p',PLAYER_ACTION_CATEGORY_COPY()[c.id]||copy('actions.ui.genericHelp','Acciones voluntarias de tu carrera.'),'muted'),button(copy('actions.ui.view','Ver acciones'),()=>{playerActionUi={screen:'player_action_category',categoryId:c.id,actionId:null,targetId:null,resultExecutionId:null};render(true);},'secondary',{localeFocus:'category-'+c.id,ariaLabel:copy('actions.ui.viewA11y','Ver acciones de '+c.label,{category:c.label})}));grid.append(p);
      }
      main.append(grid,button(copy('actions.ui.backCareer','Volver a carrera'),()=>{resetPlayerActions();render(true);},'ghost player-action-back'));
      return true;
    }
    const category=v.actions.categories.find(c=>c.id===playerActionUi.categoryId);
    if(!category){playerActionUi={screen:'player_action_menu',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};return renderPlayerActions(v,main);}
    if(playerActionUi.screen==='player_action_category'){
      main.append(el('span',copy('actions.ui.eyebrow','GESTIONAR MI CARRERA'),'eyebrow'),el('h1',category.label),el('p',PLAYER_ACTION_CATEGORY_COPY()[category.id]||copy('actions.ui.shortHelp','Acciones voluntarias.'),'muted'));
      const list=el('div',undefined,'player-action-list');
      for(const a of category.actions){
        const p=panel(a.label);p.classList.add('player-action-card');p.append(el('p',a.description,'muted'));
        const reasonSource=!a.available&&a.targetKind!=='none'?(a.targets?.find(target=>target.cooldownUntil)??a.targets?.find(target=>!target.available)??a):a;
        appendPlayerActionAvailability(p,v,reasonSource,a.unavailableReason||copy('actions.ui.notNow','Ahora mismo no está disponible.'));
        p.append(button(copy('actions.ui.open','Abrir'),()=>{playerActionUi={screen:'player_action_detail',categoryId:category.id,actionId:a.id,targetId:null,resultExecutionId:null};render(true);},'secondary',{localeFocus:'action-'+a.id,disabled:!a.available,ariaLabel:copy('actions.ui.openA11y','Abrir '+a.label,{action:a.label})}));
        list.append(p);
      }
      main.append(list,button(copy('actions.ui.backCategories','Volver a categorías'),()=>{playerActionUi={screen:'player_action_menu',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};render(true);},'ghost player-action-back'),button(copy('actions.ui.backCareer','Volver a carrera'),()=>{resetPlayerActions();render(true);},'ghost player-action-back'));
      return true;
    }
    const a=selectedPlayerAction(v);
    if(!a){playerActionUi={screen:'player_action_category',categoryId:category.id,actionId:null,targetId:null,resultExecutionId:null};return renderPlayerActions(v,main);}
    if(playerActionUi.screen==='player_action_detail'){
      main.append(el('span',copy('actions.ui.voluntary','ACCIÓN VOLUNTARIA'),'eyebrow'),el('h1',a.label),el('p',a.description,'muted'),playerActionStatusNode(a));
      const requiresTarget=a.targetKind!=='none';
      const targets=a.targets??[];
      const selectedTarget=requiresTarget?(targets.find(target=>target.id===playerActionUi.targetId)??(targets.length===1?targets[0]:null)):null;
      if(requiresTarget){
        main.append(el('h2',copy('actions.ui.who','¿Con quién?')));
        const targetList=el('div',undefined,'player-action-targets');
        for(const target of targets){
          const p=el('div',undefined,'player-action-option player-action-target');
          const selected=selectedTarget?.id===target.id;if(selected)p.classList.add('selected');
          p.append(el('strong',target.label),el('p',target.role,'muted'));
          appendPlayerActionAvailability(p,v,target,copy('actions.ui.targetUnavailable','Este objetivo no está disponible.'));
          p.append(button(selected?copy('actions.ui.selected','Seleccionado'):copy('actions.ui.choose','Elegir'),()=>{playerActionUi={...playerActionUi,targetId:target.id};render(true);},selected?'primary':'secondary',{localeFocus:'target-'+target.id,disabled:!target.available,pressed:selected,ariaLabel:copy(selected?'actions.ui.selectedA11y':'actions.ui.chooseA11y',(selected?'Objetivo seleccionado: ':'Elegir objetivo: ')+target.label,{name:target.label})}));
          targetList.append(p);
        }
        if(!targets.length)targetList.append(el('p',a.unavailableReason||copy('actions.ui.noTarget','No hay un objetivo disponible.'),'player-action-reason'));
        main.append(targetList);
      }
      const availabilitySource=selectedTarget??a;
      if(!availabilitySource.available){
        const detailState=el('div',undefined,'player-action-detail-state');
        const cooldown=cooldownText(v,availabilitySource);if(cooldown)detailState.append(el('p',cooldown,'player-action-cooldown'));
        if(availabilitySource.unavailableReason)detailState.append(el('p',availabilitySource.unavailableReason,'player-action-reason'));
        else if(!cooldown)detailState.append(el('p',copy('actions.ui.notNow','Ahora mismo no está disponible.'),'player-action-reason'));
        main.append(detailState);
      }
      const options=el('div',undefined,'player-action-options');
      const availableOptions=requiresTarget?(selectedTarget?.options??[]):a.options;
      for(const o of availableOptions){
        const enabled=availabilitySource.available&&o.available;
        const p=el('div',undefined,'player-action-option');if(!enabled)p.classList.add('unavailable');
        if(o.description)p.append(el('p',o.description,'muted'));
        p.append(button(o.label,()=>run('player_action',{actionId:a.id,optionId:o.id,...(selectedTarget?{targetId:selectedTarget.id}:{})},()=>{
          const latest=session.getView().actions?.lastResult;
          playerActionUi={screen:'player_action_result',categoryId:category.id,actionId:a.id,targetId:selectedTarget?.id??null,resultExecutionId:latest?.executionId??null};
        }),'secondary',{localeFocus:'option-'+a.id+'-'+o.id,disabled:!enabled}));
        if(!enabled&&o.unavailableReason&&o.unavailableReason!==availabilitySource.unavailableReason)p.append(el('p',o.unavailableReason,'player-action-reason'));
        options.append(p);
      }
      if(requiresTarget&&!selectedTarget)options.append(el('p',copy('actions.ui.chooseFirst','Elige primero una persona para ver las opciones disponibles.'),'player-action-reason'));
      main.append(options,button(copy('actions.ui.back','Volver'),()=>{playerActionUi={screen:'player_action_category',categoryId:category.id,actionId:null,targetId:null,resultExecutionId:null};render(true);},'ghost player-action-back'));
      return true;
    }
    if(playerActionUi.screen==='player_action_result'){
      const result=v.actions?.lastResult??null;
      if(!result||result.executionId!==playerActionUi.resultExecutionId){playerActionUi={screen:'player_action_menu',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};return renderPlayerActions(v,main);}
      const p=el('article',undefined,'panel player-action-result');p.append(el('span',copy('actions.ui.completed','ACCIÓN COMPLETADA'),'eyebrow'),el('h1',a.label),el('p',result.text,'story-text'));
      const actions=el('div',undefined,'player-action-result-actions');actions.append(button(copy('actions.ui.another','Realizar otra acción'),()=>{playerActionUi={screen:'player_action_menu',categoryId:null,actionId:null,targetId:null,resultExecutionId:null};render(true);}),button(copy('actions.ui.backHome','Volver a Inicio'),()=>navigate('home'),'primary'));p.append(actions);main.append(p);return true;
    }
    resetPlayerActions();return false;
  }
  function autoSimulationState(v){
    const mode=v.simulation?.mode;
    if(!['auto_simulating','paused'].includes(mode))return null;
    const p=el('section',undefined,'auto-sim-state');
    const state=el('div',undefined,'auto-sim-state-row');
    state.append(el('span',mode==='paused'?copy('career.home.paused','PAUSADA'):copy('career.home.simulating','SIMULANDO'),'auto-sim-state-label'),el('span',date(v.date),'auto-sim-current-date'));
    state.lastChild.dataset.p5AutoDate='';
    p.append(state);
    const progress=autoSimulationProgress(v);
    if(progress){
      const progressLabel=el('span',copy('career.home.progress',`${progress.elapsedDays} de ${progress.totalDays} días · ${Math.round(progress.percent)} %`,{elapsed:progress.elapsedDays,total:progress.totalDays,percent:Math.round(progress.percent)}),'auto-sim-progress-text');
      progressLabel.dataset.p5AutoProgressText='';
      const meter=el('progress',undefined,'auto-sim-progress');
      meter.max=progress.totalDays;meter.value=progress.elapsedDays;meter.dataset.p5AutoProgress='';
      meter.setAttribute('aria-label',copy('career.home.progressA11y',`Progreso de la simulación: ${progress.elapsedDays} de ${progress.totalDays} días, ${Math.round(progress.percent)} %`,{elapsed:progress.elapsedDays,total:progress.totalDays,percent:Math.round(progress.percent)}));
      p.append(progressLabel,meter);
    }
    return p;
  }
  function mainAction(v){
    if(v.screen==='offer')return button(copy('career.home.reviewOffer','Revisar oferta'),openCinematic,'primary',{blockedWhenPaused:true});
    if(v.screen==='decision')return button(copy('career.home.decision','Una decisión te espera'),openCinematic,'primary',{blockedWhenPaused:true});
    if(v.screen==='result')return button(copy('career.home.result','Volver a tu decisión'),openCinematic,'primary',{blockedWhenPaused:true});
    if(v.screen==='epilogue')return button(copy('career.home.career','Ver mi carrera'),()=>navigate('career'),'primary');
    if(compactHome&&['career','home'].includes(v.screen)&&!['auto_simulating','paused'].includes(v.simulation?.mode))return button(copy('career.home.nextMatch','Simular próximo partido'),()=>run('continue',{maxDays:90}),'primary',{blockedWhenPaused:true});
    if(v.simulation){
      if(v.screen==='summary')return button(copy('career.home.keepSimulating','Seguir simulando'),()=>run('auto',{action:'start'}),'primary',{blockedWhenPaused:true});
      if(v.simulation.mode==='auto_simulating'&&!autoResumeAllowed)return button(copy('career.home.resume','Reanudar simulación'),resumeLoadedSimulation,'primary');
      if(v.simulation.mode==='auto_simulating')return button(copy('career.home.pause','Pausar simulación'),()=>run('auto',{action:'pause'}),'primary',{blockedWhenPaused:true});
      if(v.simulation.mode==='paused')return button(copy('career.home.resume','Reanudar simulación'),()=>run('auto',{action:'resume'}),'primary',{blockedWhenPaused:true});
      return button(copy('career.home.simulate','Simular'),()=>run('auto',{action:'start'}),'primary',{blockedWhenPaused:true});
    }
    return button(copy('career.home.week','Simular semana'),()=>run('continue',{maxDays:7}),'primary',{blockedWhenPaused:true});
  }
  function hero(v){const h=el('article',undefined,'hero profile-hero');h.append(photo('hero_player'));const c=el('div',undefined,'hero-copy');c.append(el('span',copy('career.home.profile','TU PERFIL'),'eyebrow'),el('h1',v.player.displayName,'player-name'),el('p',copy('career.home.age',position(v)+' · '+v.age+' años',{position:position(v),age:v.age})),el('p',club(v),'muted'));h.append(c);return h;}
  function homeHero(v){
    const h=el('article',undefined,'hero home-hero');h.append(photo('hero_player'));
    const c=el('div',undefined,'hero-copy');
    c.append(el('span',copy('career.home.myCareer','MI CARRERA'),'eyebrow'),el('h1',v.player.displayName,'player-name'),el('p',copy('career.home.age',position(v)+' · '+v.age+' años',{position:position(v),age:v.age})),el('p',club(v),'muted'));
    h.append(c);return h;
  }
  function stats(v,compact=false,embedded=false){
    const p=embedded?el('section',undefined,'panel profile-moment'):panel(copy('career.home.moment','Tu momento'));
    if(embedded)p.append(el('h2',copy('career.home.moment','Tu momento')));if(compact)p.classList.add('moment-compact');
    const rows=[
      [copy('career.home.form','Forma'),v.form,copy('career.home.formHelp','Rendimiento actual: refleja cómo estás compitiendo ahora.')],
      [copy('career.home.fitness','Estado físico'),v.fitness,copy('career.home.fitnessHelp','Condición corporal y disponibilidad física.')],
      [copy('career.home.fatigue','Fatiga'),v.fatigue,copy('career.home.fatigueHelp','Desgaste acumulado: cuanto más alta, peor.')]
    ];
    for(const [label,value,help] of rows){
      const row=el('div',undefined,'meter');
      const name=el('span',label);name.title=help;
      row.append(name,el('strong',Math.round(value)+' / 100'));
      const meter=el('progress');meter.max=100;meter.value=value;meter.setAttribute('aria-label',label+'. '+help);
      row.append(meter);
      if(!compact)row.append(el('small',help,'meter-help'));
      p.append(row);
    }
    if(compact){
      const help=el('details',undefined,'moment-help');help.append(el('summary',copy('career.home.dataHelp','Qué significan estos datos')));
      help.append(el('p',copy('career.home.dataHelpBody','Forma mide tu rendimiento actual. Estado físico refleja disponibilidad corporal. Fatiga es el desgaste acumulado: cuanto más alta, peor.'),'muted'));
      p.append(help);
    }
    p.append(el('p',copy(v.appearances===1?'career.home.appearancesOne':'career.home.appearancesMany',v.appearances+(v.appearances===1?' partido disputado':' partidos disputados'),{count:v.appearances}),'muted'));
    return p;
  }
  function retirementPanel(v){
    if(v.retirementStatus==='playing')return null;
    const retirementCopy={
      decided:[copy('career.record.futureTitle','Considerando el futuro'),copy('career.record.futureBody','Has decidido encarar el final de tu carrera. El juego conservará este estado hasta que la historia avance.')],
      announced:[copy('career.record.announcedTitle','Retirada anunciada'),copy('career.record.announcedBody','Tu decisión ya es pública. La carrera continúa hasta su cierre según el estado del juego.')],
      closed:[copy('career.record.closedTitle','Carrera finalizada'),copy('career.record.closedBody','La etapa como futbolista ha terminado. Recorre tu carrera y el epílogo.')]
    }[v.retirementStatus];
    if(!retirementCopy)return null;
    const p=panel(retirementCopy[0]);p.classList.add('retirement-panel');p.append(el('p',retirementCopy[1],'muted'));
    if(v.retirementStatus==='closed'){
      const totals=v.careerSeasons.reduce((acc,row)=>{acc.matches+=row.appearances;acc.goals+=row.goals;acc.assists+=row.assists;return acc;},{matches:0,goals:0,assists:0});
      const summary=el('div',undefined,'retirement-summary');
      for(const [label,value] of [[copy('career.record.matches','Partidos'),totals.matches],[copy('career.record.goals','Goles'),totals.goals],[copy('career.record.assists','Asistencias'),totals.assists]]){const item=el('div');item.append(el('span',label),el('strong',String(value)));summary.append(item);}
      p.append(summary);
      const actions=el('div',undefined,'dialog-actions');
      if(view!=='career')actions.append(button(copy('career.record.viewCareer','Ver carrera'),()=>navigate('career'),'primary'));
      actions.append(button(copy('career.record.newStory','Empezar otra historia'),()=>navigate('save')));
      p.append(actions);
    }
    return p;
  }
  function interruptionText(type){const labels={decision:'Ha aparecido una decisión que necesita tu respuesta.',offer:'Ha llegado una oferta que necesita tu respuesta.',important_injury:'Una lesión importante requiere atención.',national_selection:'Hay novedades de selección internacional.',role_change:'Tu rol deportivo ha cambiado.',career_change:'Tu situación de club ha cambiado.',season_complete:'La temporada deportiva ha terminado.',season_transition:'Ha cambiado la temporada o una etapa de tu carrera.',retirement:'Tu carrera ha alcanzado su cierre.',max_auto_weeks:'El tramo automático ha llegado a su límite.'};return copy('career.period.interruption.'+(Object.hasOwn(labels,type)?type:'other'),labels[type]||'La simulación se ha detenido en un momento relevante.');}
  function periodParticipation(value){const labels={'Baja por lesión':'career.period.injured','Sancionado':'career.period.suspended','No convocado':'career.record.notSelected','Suplente sin minutos':'career.record.noMinutes','Titular':'career.record.starter','Entraste desde el banquillo':'career.record.substitute'};return Object.hasOwn(labels,value)?copy(labels[value],value):locale()==='es'?value:copy('career.period.participationPending','Los detalles de participación están disponibles en Español.');}
  function simulationSummary(v){
    const s=v.simulation?.summary;if(!s)return null;
    const p=panel(copy('career.period.title','Resumen del periodo'));p.classList.add('period-summary');
    p.append(el('p',copy('career.period.duration',`${date(s.fromDate)} → ${date(s.toDate)} · ${s.daysSimulated} días · ${s.weeksSimulated} semanas`,{from:date(s.fromDate),to:date(s.toDate),days:copy('career.period.'+(s.daysSimulated===1?'day':'days'),s.daysSimulated+' días',{count:s.daysSimulated}),weeks:copy('career.period.'+(s.weeksSimulated===1?'week':'weeks'),s.weeksSimulated+' semanas',{count:s.weeksSimulated})}),'muted'));
    const rows=[[copy('career.period.matches','Partidos disputados'),`+${s.matches.appearances}`],[copy('career.period.form','Forma'),`${s.playerChanges.form>=0?'+':''}${Math.round(s.playerChanges.form)}`],[copy('career.period.fatigue','Fatiga'),`${s.playerChanges.fatigue>=0?'+':''}${Math.round(s.playerChanges.fatigue)}`],[copy('career.period.fitness','Estado físico'),`${s.playerChanges.fitness>=0?'+':''}${Math.round(s.playerChanges.fitness)}`]];
    for(const [label,value] of rows){const row=el('div',undefined,'data-row');row.append(el('span',label),el('strong',value));p.append(row);}
    if(s.careerChanges.clubFrom!==s.careerChanges.clubTo||s.careerChanges.roleFrom!==s.careerChanges.roleTo)p.append(el('p',copy('career.period.career',`Carrera: ${clubName(s.careerChanges.clubFrom)} → ${clubName(s.careerChanges.clubTo)} · ${s.careerChanges.roleFrom} → ${s.careerChanges.roleTo}`,{clubFrom:clubName(s.careerChanges.clubFrom),clubTo:clubName(s.careerChanges.clubTo),roleFrom:s.careerChanges.roleFrom,roleTo:s.careerChanges.roleTo}),'muted'));
    for(const text of s.worldHighlights.slice(-3))p.append(el('p',text,'muted'));
    for(const line of s.report?.context??[])p.append(el('p',line,'story-text'));
    if(s.report?.fixtures.length){
      const matches=el('details',undefined,'period-fixtures');matches.append(el('summary',copy('career.period.fixtures','Partidos del periodo · '+s.report.fixtures.length,{count:s.report.fixtures.length})));
      for(const m of s.report.fixtures){
        const row=el('article',undefined,'period-fixture');
        const home=m.homeAway==='home'?clubName(m.club):clubName(m.opponent),away=m.homeAway==='home'?clubName(m.opponent):clubName(m.club);
        row.append(el('time',date(m.date),'eyebrow'),el('p',m.homeGoals===null?`${home} · ${away}`:`${home} ${m.homeGoals} – ${m.awayGoals} ${away}`),el('p',`${periodParticipation(m.participation)} · ${m.minutes} min`+(m.rating===null?'':' · '+copy('career.period.rating','Nota '+decimal(m.rating),{rating:decimal(m.rating)})),'muted'));matches.append(row);
      }
      p.append(matches,button(copy('career.period.history','Ver historial deportivo'),()=>navigate('career')));
    }
    if(s.interruption)p.append(el('p',interruptionText(s.interruption.type),'period-interruption'));
    return p;
  }
  function home(v,main){
    if(compactHome){
      main.classList.add('reddit-home');
      const card=el('section',undefined,'reddit-player');card.append(photo('hero_player','reddit-portrait'));
      const identity=el('div',undefined,'reddit-identity');identity.append(el('span',copy('career.home.yourCareer','TU CARRERA'),'eyebrow'),el('h1',v.player.displayName),el('p',copy('career.home.age',position(v)+' · '+v.age+' años',{position:position(v),age:v.age})),el('p',club(v),'muted'));card.append(identity);
      const metrics=el('div',undefined,'reddit-metrics');
      for(const [label,value]of[[copy('career.home.form','Forma'),v.form],[copy('career.home.physical','Físico'),v.fitness],[copy('career.home.fatigue','Fatiga'),v.fatigue]]){const metric=el('div');metric.append(el('span',label),el('strong',String(Math.round(value))));const bar=el('progress');bar.max=100;bar.value=value;bar.setAttribute('aria-label',copy('career.home.meter',label+' '+Math.round(value)+' de 100',{label,value:Math.round(value)}));metric.append(bar);metrics.append(metric);}card.append(metrics);main.append(card);
      const next=el('section',undefined,'reddit-next');next.append(el('span',date(v.date),'eyebrow'),el('h2',v.decision?.title||v.result?.title||(v.offer?copy('career.home.offerTitle','Una oferta para ti'):null)||(v.screen==='epilogue'?copy('career.home.legacy','Tu legado'):v.simulation?.mode==='auto_simulating'?copy('career.home.time','El tiempo avanza…'):copy('career.home.nextChapter','Tu siguiente capítulo'))));
      next.append(el('p',['decision','result','offer'].includes(v.screen)?copy('career.home.decisionsHelp','Tus decisiones construyen tu historia.'):copy('career.home.advanceHelp','Avanza hasta el próximo momento importante.'),'muted'));const primary=mainAction(v);primary.dataset.localeFocus='primary';next.append(primary);const advance=el('div',undefined,'reddit-advance');advance.append(next);if(careerSports){const sports=careerSports(session);advance.append(calendarCard(sports));}main.append(advance);
      if(onDaily){const daily=button('',onDaily,'reddit-daily');daily.replaceChildren(el('span',copy('career.home.dailyEyebrow','RETO DEL DÍA'),'eyebrow'),el('strong',copy('career.home.dailyBody','30 decisiones. Una carrera entera.')),el('span',copy('career.home.dailyPlay','Jugar Daily →')));main.append(daily);}
      return;
    }
    if(assets.brand_cover){const cover=el('div',undefined,'brand-home-cover');cover.append(photo('brand_cover','brand-cover'));main.append(cover);}
    if(v.screen==='epilogue')main.classList.add('p9-epilogue');
    if(v.screen==='epilogue'||v.cutscene?.eventId==='PROLOGUE')appendCutscene(v,main);
    const grid=el('div',undefined,'home-grid p3-home');
    const identity=homeHero(v);
    const simMode=v.simulation?.mode;
    const temporal=['auto_simulating','paused'].includes(simMode);
    const next=panel(v.screen==='epilogue'?'El final de un capítulo':v.screen==='summary'?'Tu último tramo':temporal?'Simulación':'Lo que viene ahora');next.classList.add('next');next.append(photo('stadium_bg','card-bg'));
    const content=el('div',undefined,'next-content');
    const nextDate=el('span',date(v.date),'eyebrow');nextDate.dataset.p5AutoDate='';
    content.append(
      nextDate,
      el('h2',v.offer?.reason||v.decision?.title||v.result?.title||(v.screen==='epilogue'?'Una carrera para recordar':v.screen==='summary'?'El tiempo ha avanzado':simMode==='paused'?'Simulación pausada':simMode==='auto_simulating'?'Simulando':'El siguiente paso')),
      el('p',v.offer?'Hay una propuesta de contrato que necesita tu respuesta.':v.decision?'Hay un momento que necesita tu respuesta.':v.result?'Tu decisión ya forma parte de esta historia.':v.screen==='epilogue'?'Mira atrás y recorre los momentos que te han traído hasta aquí.':v.screen==='summary'?'Revisa este tramo antes de seguir.':simMode==='paused'?'Reanuda cuando quieras o termina este bloque.':simMode==='auto_simulating'?'El tiempo avanza hasta el siguiente momento importante.':'Simula hasta el siguiente momento importante.','muted')
    );
    const autoState=autoSimulationState(v);if(autoState)content.append(autoState);
    const primary=mainAction(v);primary.dataset.localeFocus='primary';content.append(primary);
    if(v.screen==='career'&&v.simulation?.mode==='idle'&&v.actions?.available)content.append(button(copy('career.record.manage','Gestionar mi carrera'),openPlayerActions,'secondary'));
    if(v.screen==='career'&&v.simulation?.mode==='paused')content.append(button('Terminar simulación',()=>run('auto',{action:'stop'}),'secondary'));
    next.append(content);

    const urgent=['offer','decision','result'].includes(v.screen);
    if(urgent){grid.classList.add('has-pending');grid.append(next,identity);}
    else grid.append(identity,next);
    grid.append(stats(v,true));

    const sport=latestMatchCard(v.latestMatch);if(sport){sport.classList.add('home-sport');grid.append(sport);}
    const recent=panel('El último capítulo');recent.classList.add('recent');recent.append(photo('hero_player','news-thumb'));const row=v.journal.at(-1);recent.append(el('h3',row?.title||'Todo empieza en Valdoria'),el('p',row?.messages[0]||'Una oportunidad de acercarte al primer equipo. Todavía queda todo por decidir.','muted'),button('Recorrer mi historia',()=>navigate('career')));grid.append(recent);
    const chapter=panel('Tu carrera');chapter.classList.add('home-career');chapter.append(el('span',v.season.replace('-',' / 20'),'eyebrow'),el('div',String(v.decisionsMade),'big-number'),el('p',v.decisionsMade===1?'decisión que cuenta':'decisiones que cuentan','muted'),el('p','Tu carrera cambia con tus decisiones y lo que pasa en el campo.'),button('Ver recorrido',()=>navigate('career')));grid.append(chapter);
    const people=panel('Tu entorno');people.classList.add('home-people');const contacts=v.contacts.slice(0,3);for(const c of contacts){const card=personCard(c,{compact:true});if(card)people.append(card);}people.append(button('Ver relaciones',()=>navigate('relations')));grid.append(people);
    const clock=contractSummary(v,{compact:true});clock.classList.add('home-contract');grid.append(clock);
    const tutorial=el('details',undefined,'tutorial home-help');
    tutorial.append(el('summary','Cómo se juega'));
    const tutorialBody=el('div',undefined,'tutorial-body');
    tutorialBody.append(el('p','Los partidos avanzan solos; tú decides cuando aparece un momento importante.','tutorial-lead'));
    const rules=el('ul',undefined,'tutorial-rules');for(const text of ['Simula para avanzar el tiempo y el mundo.','Decide cuando aparezca un momento importante.','Tus decisiones y relaciones quedan en la carrera.'])rules.append(el('li',text));tutorialBody.append(rules);
    tutorial.append(tutorialBody);grid.append(tutorial);

    main.append(grid);
    const sim=simulationSummary(v);if(sim)main.append(sim);
    const retirement=retirementPanel(v);if(retirement)main.append(retirement);
    if(v.offerHistory.length){const h=v.offerHistory.at(-1),p=panel('Tu última respuesta de contrato');p.append(el('p',h.explanation));main.append(p);}
  }
  function calendarCard(sports){
    const card=el('section',undefined,'reddit-calendar');card.append(el('span',copy('career.calendar.team','TU EQUIPO'),'eyebrow'));
    const summary=button(sports.position?copy('career.calendar.leagueReady',`Liga · ${sports.position}º · ${sports.points} pts`,{position:sports.position,points:sports.points}):copy('career.calendar.leagueEmpty','Liga · Sin empezar'),()=>showSports(sports),'reddit-league-link');summary.setAttribute('aria-label',copy('career.calendar.calendarA11y','Ver calendario y clasificación de la liga'));card.append(summary);
    for(const match of sports.recent){const home=match.homeAway==='home',gf=home?match.result.homeGoals:match.result.awayGoals,ga=home?match.result.awayGoals:match.result.homeGoals;const row=el('div',undefined,'reddit-fixture');row.append(el('small',(match.competition==='champions'?'CH · ':'')+date(match.date)),el('span',clubName(match.opponent)),el('strong',`${gf}–${ga}`));card.append(row);}
    const upcoming=sports.upcoming[0];if(upcoming){const row=el('div',undefined,'reddit-fixture upcoming');row.append(el('small',(upcoming.competition==='champions'?'CHAMPIONS · ':copy('career.calendar.upcoming','PRÓXIMO · '))+date(upcoming.date)),el('span',clubName(upcoming.opponent)));card.append(row);}else if(!sports.recent.length)card.append(el('p',copy('career.calendar.noFixtures','Sin partidos programados.'),'muted'));
    return card;
  }
  function showSports(sports){
    const dialog=el('dialog',undefined,'dialog reddit-sports-dialog'),head=el('header');const close=button(copy('career.calendar.close','Cerrar'),()=>dialog.close());head.append(el('h2',sports.club),close);dialog.append(head);
    const tabs=el('nav',undefined,'reddit-sports-tabs'),body=el('div',undefined,'reddit-sports-body');dialog.append(tabs,body);
    const table=rows=>{const t=el('table',undefined,'reddit-league-table'),thead=el('thead'),tr=el('tr');for(const label of ['#',copy('career.calendar.teamColumn','Equipo'),copy('career.calendar.played','PJ'),copy('career.calendar.difference','DG'),copy('career.calendar.points','Pts')])tr.append(el('th',label));thead.append(tr);t.append(thead);const tbody=el('tbody');for(const row of rows){const line=el('tr',undefined,row.you?'your-team':'');for(const value of [row.position,row.name,row.played,row.gf-row.ga,row.points])line.append(el('td',String(value)));tbody.append(line);}t.append(tbody);return t;};
    const results=(competition)=>{const teams=competition.teams;let previous='';for(const m of competition.matches){const heading=m.stage?`${m.stage} · ${date(m.date)}`:copy('career.calendar.round',`Jornada ${m.round} · ${date(m.date)}`,{round:m.round,date:date(m.date)});if(heading!==previous){body.append(el('h3',heading));previous=heading;}const home=teams[m.home],away=teams[m.away],row=el('div',undefined,'reddit-calendar-row');row.append(el('span',home.name),el('strong',`${m.hg} – ${m.ag}`),el('span',away.name));if(m.penalties)row.append(el('small',copy('career.calendar.penalties',`Penaltis ${m.penalties.home}–${m.penalties.away}`,m.penalties)));body.append(row);}};
    let selectedTab='table';
    function show(tab){selectedTab=tab;body.replaceChildren();for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.tab===tab));let displayed;try{displayed=presentationLocale?.presentCareerSports?.(sports)??sports;}catch(error){if(error.code!=='MISSING_CAREER_SPORTS_TRANSLATION')throw error;const warning=el('p',copy('career.calendar.translationPending','Estos datos deportivos están disponibles en Español. Cambia el idioma para verlos.'),'muted');warning.setAttribute('role','status');body.append(warning);return;}body.append(el('p',copy('career.calendar.season','Temporada '+displayed.season+' · '+displayed.division,{season:displayed.season,division:displayed.division}),'muted'));
      if(tab==='table')body.append(el('h3',copy('career.calendar.leagueTable','Clasificación de liga')),table(displayed.rows));
      else if(tab==='results'){if(displayed.league?.matches.length)results(displayed.league);else{const history=(displayed.allRecent??displayed.recent).filter(m=>m.result);body.append(el('p',history.length?copy('career.calendar.teamResults','Resultados de tu equipo'):copy('career.calendar.noRounds','Todavía no hay jornadas disputadas.'),'muted'));for(const m of history){const home=m.homeAway==='home',row=el('div',undefined,'reddit-calendar-row');row.append(el('span',`${date(m.date)} · ${home?displayed.club:clubName(m.opponent)}`),el('strong',`${m.result.homeGoals} – ${m.result.awayGoals}`),el('span',home?clubName(m.opponent):displayed.club));body.append(row);}}}
      else {const c=displayed.continental;if(!c)body.append(el('p',copy('career.calendar.newCalendar','Disponible con el nuevo calendario de competiciones.')));else{body.append(el('h3','Champions'),el('p',c.format,'muted'));if(!c.qualified)body.append(el('p',copy('career.calendar.notQualified','Tu equipo no está clasificado esta temporada.')));if(c.rows.length)body.append(table(c.rows));if(c.winner)body.append(el('p',copy('career.calendar.champion','Campeón: '+c.winner,{team:c.winner})));if(c.matches.length)results(c);}}
      body.scrollTop=0;
    }
    for(const [id,label]of [['table',copy('career.calendar.table','Clasificación')],['results',copy('career.calendar.results','Resultados')],['continental','Champions']]){const b=button(label,()=>show(id));b.dataset.tab=id;tabs.append(b);}activeDialogLocale=()=>{dialog.lang=locale();close.firstChild.textContent=copy('career.calendar.close','Cerrar');for(const b of tabs.children)b.firstChild.textContent=b.dataset.tab==='table'?copy('career.calendar.table','Clasificación'):b.dataset.tab==='results'?copy('career.calendar.results','Resultados'):'Champions';show(selectedTab);};activeDialogLocale();shell.append(dialog);dialog.addEventListener('close',()=>{activeDialogLocale=null;dialog.remove();if(presentationLocale&&!disposed&&!busy)render();});dialog.showModal();
  }
  function portrait(id){return ({NPC_CCH_01:'portrait_coach',NPC_MED_01:'portrait_doctor',NPC_FAM_01:'portrait_mother',NPC_FAM_02:'portrait_father',NPC_AGT_01:'portrait_agent',NPC_AGT_02:'portrait_agent'})[id]||null;}
  function renderDecision(v,main){if(v.screen==='offer'){renderOffer(v,main);return;}const d=v.decision, result=v.screen==='result';if(d)lastArt=['preseason','sport','team','captaincy','tactical'].includes(d.family)?'prematch_scene':'stadium_bg';
    main.classList.add('cinema',result?'cinema-result':'cinema-decision');main.append(photo(lastArt,'cinema-bg'));const top=el('div',undefined,'cinema-top');top.append(button('Volver a Inicio',closeCinematic,'glass'),el('span',date(v.date)+' · '+club(v),'eyebrow'));main.append(top);
    const sheet=el('section',undefined,'decision-sheet '+(result?'result-sheet':'decision-choice-sheet'));sheet.dataset.immersiveState=result?'result':'decision';const heading=el('h1',result?v.result.title:d.title);heading.id='immersive-title';sheet.setAttribute('aria-labelledby',heading.id);sheet.append(el('span',result?'DESPUÉS DE TU DECISIÓN':'UN MOMENTO QUE CUENTA','eyebrow'),heading);
    appendCutscene(v,sheet);
    if(result){
      const choiceSummary=el('div',undefined,'result-choice');choiceSummary.append(el('span','TU DECISIÓN','eyebrow'),el('p',v.result.choiceLabel,'chosen'));sheet.append(choiceSummary);
      const visible=v.result.visibleEffects??[], narrative=v.result.narrativeEffects??[], deferred=v.result.hiddenEffects??[];
      if(visible.length||narrative.length||deferred.length){
        const consequences=el('section',undefined,'consequence-summary result-consequences');const consequenceHeading=el('h2','Consecuencias');consequenceHeading.id='result-consequences-title';consequences.setAttribute('aria-labelledby',consequenceHeading.id);consequences.append(consequenceHeading);
        for(const effect of visible){const row=el('div',undefined,'consequence-row '+(effect.favorable===true?'favorable':effect.favorable===false?'unfavorable':'neutral'));row.append(el('span',effect.label),el('strong',deltaText(effect.delta)));consequences.append(row);}
        narrative.forEach(message=>consequences.append(el('p',message,'story-text')));
        const narrated=new Set(narrative);(v.result.messages??[]).filter(message=>!narrated.has(message)).forEach(message=>consequences.append(el('p',message,'story-text')));
        deferred.forEach(message=>consequences.append(el('p',message,'muted result-deferred')));
        sheet.append(consequences);
      }else{const messages=el('section',undefined,'result-messages');(v.result.messages??[]).forEach(m=>messages.append(el('p',m,'story-text')));sheet.append(messages);}
      if(v.resultCategory==='match'){const summary=el('section',undefined,'match-summary result-match-summary');const matchHeading=el('h2','Resumen del partido');matchHeading.id='result-match-title';summary.setAttribute('aria-labelledby',matchHeading.id);summary.append(matchHeading,el('p','Tu decisión queda registrada en el recorrido.','muted'));const rows=[['Fecha',date(v.date)],['Partidos disputados',String(v.appearances)],[copy('career.period.form','Forma'),`${Math.round(v.form)} / 100`],[copy('career.period.fitness','Estado físico'),`${Math.round(v.fitness)} / 100`]];for(const [label,value]of rows){const row=el('div',undefined,'data-row');row.append(el('span',label),el('strong',value));summary.append(row);}sheet.append(summary);}const next=button('Continuar',()=>run('acknowledge'),'primary result-continue',{blockedWhenPaused:true});next.setAttribute('data-result-continue','');sheet.append(next);}
    else{sheet.append(el('p',d.body,'story-text'));
      if(d.memories?.length){const memories=el('details',undefined,'intel decision-memories');memories.append(el('summary','De tu historia · '+d.memories.length));memories.append(el('p','Decisiones anteriores relacionadas con este capítulo.','muted'));for(const memory of d.memories){const row=el('div',undefined,'decision-memory');row.append(el('time',date(memory.date),'eyebrow'),el('h3',memory.title),el('p',memory.choiceLabel),button('Ver este capítulo',()=>{navigate('career');const target=root.querySelector('[data-journal-index="'+memory.journalIndex+'"]');if(target){target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}}));memories.append(row);}sheet.append(memories);}
      const hasIntel=(d.visible??[]).some(t=>t.trim())||(d.uncertain??[]).some(t=>t.trim());if(hasIntel){const intel=el('details',undefined,'intel');intel.open=!compactHome;intel.append(el('summary',d.visible?.length&&d.uncertain?.length?'Lo que sabes · lo que queda por descubrir':d.visible?.length?'Lo que sabes':'Lo que no está claro'));for(const [title,lines]of[['Lo que sabes',d.visible],['Lo que no está claro',d.uncertain]]){if(lines.length){intel.append(el('h3',title));lines.forEach(t=>intel.append(el('p',t)));}}sheet.append(intel);}const choices=el('div',undefined,'choices decision-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','Opciones de decisión');d.choices.forEach((c,i)=>{const b=button('',()=>run('choose',{pendingInstanceId:d.instanceId,choiceId:c.id}),'choice',{blockedWhenPaused:true});b.replaceChildren(el('span',String.fromCharCode(65+i),'choice-key'),el('span',c.label));choices.append(b);});sheet.append(choices);}
    if(compactHome)compactSheet(sheet,sheet.querySelector(result?'.result-continue':'.decision-choices'));
    main.append(sheet);}
  function compactSheet(sheet,actions){
    if(!actions)return;
    const copy=el('div',undefined,'reddit-scene-copy');
    for(const child of [...sheet.childNodes])if(child!==actions)copy.append(child);
    sheet.replaceChildren(copy,actions);sheet.classList.add('reddit-scene');
  }
  function renderOffer(v,main){
    const o=v.offer,p=offerCard(o,{actions:[['accept','Aceptar oferta'],['reject','Rechazar oferta'],['delegate','Delegar esta oferta']],explanation:'Una propuesta para tu carrera. Revisa las condiciones antes de decidir.',delegateHelp:true});
    main.classList.add('cinema','cinema-offer');main.append(photo('stadium_bg','cinema-bg'));const top=el('div',undefined,'cinema-top');top.append(button('Volver a Inicio',closeCinematic,'glass'),el('span',date(v.date)+' · '+club(v),'eyebrow'));main.append(top);
    p.classList.add('offer-sheet');p.dataset.immersiveState='offer';const heading=p.querySelector('h2');if(heading){heading.id='immersive-offer-title';p.setAttribute('aria-labelledby',heading.id);}const actions=p.querySelector('.choices');if(actions){actions.classList.add('offer-actions');actions.setAttribute('role','group');actions.setAttribute('aria-label','Respuesta a la oferta');}if(compactHome)compactSheet(p,actions);main.append(p);
  }
  function offerHistory(v,main){for(const h of [...v.offerHistory].reverse()){const p=offerCard(h.offer,{explanation:h.explanation});if(p)main.append(p);}}
  function career(v,main){
    if(playerActionUi.screen!=='career'&&renderPlayerActions(v,main))return;
    main.classList.add('p8-career');
    const intro=el('header',undefined,'career-intro');intro.append(el('span',copy('career.record.careerEyebrow','HISTORIAL VIVO DE TU TRAYECTORIA'),'eyebrow'),el('h1',copy('career.record.careerTitle','Tu carrera')),el('p',copy('career.record.careerIntro','Partidos, temporadas, hitos y decisiones que ya forman parte de tu historia.'),'muted'));main.append(intro);
    if(v.screen==='career'&&v.simulation?.mode==='idle'&&v.actions?.available){
      const manage=panel(copy('career.record.manage','Gestionar mi carrera'));manage.classList.add('player-actions-entry');manage.append(el('p',copy('career.record.manageIntro','Opcional: puedes hacer algo antes de simular. Nada es obligatorio.'),'muted'),button(copy('career.record.manage','Gestionar mi carrera'),openPlayerActions,'secondary'));main.append(manage);
    }
    const retirement=retirementPanel(v);if(retirement)main.append(retirement);
    const recentPeriod=simulationSummary(v);if(recentPeriod)main.append(recentPeriod);

    const latest=latestMatchCard(v.latestMatch,{empty:true});if(latest){latest.classList.add('career-latest');main.append(latest);}

    const seasonsSection=el('section',undefined,'career-section career-seasons-section');seasonsSection.setAttribute('aria-labelledby','career-seasons-title');
    const seasonsHead=el('div',undefined,'career-section-head'),seasonsTitle=el('h2',copy('career.record.seasons','Temporadas'));seasonsTitle.id='career-seasons-title';seasonsHead.append(seasonsTitle);seasonsSection.append(seasonsHead);
    if(!v.careerSeasons.length){
      const empty=panel(copy('career.record.start','Tu carrera empieza aquí'));empty.classList.add('career-empty','semantic-empty');
      empty.append(el('p',copy('career.record.startInfo',v.age+' años · '+club(v)+' · Temporada '+v.season.replace('-',' / 20'),{age:v.age,club:club(v),season:v.season.replace('-',' / 20')}),'career-start'));
      empty.append(el('p',v.appearances===0?copy('career.record.noDebut','Aún no has debutado. Los partidos, hitos y cambios importantes aparecerán aquí.'):copy('career.record.noSeason','Tu historial deportivo empezará a agruparse por temporada cuando existan registros oficiales.'),'muted'));
      seasonsSection.append(empty);
    }else{
      const seasons=el('div',undefined,'season-grid');
      for(const s of [...v.careerSeasons].reverse()){const card=careerSeasonCard(s);if(card)seasons.append(card);}
      seasonsSection.append(seasons);
    }
    main.append(seasonsSection);

    const milestoneCards=[];
    if(v.careerMilestones?.historyComplete&&v.careerMilestones.appearances>0){
      const m=v.careerMilestones,chips=[copy('career.record.debut','Debut oficial')];
      for(const [flag,label] of [['appearance10',copy('career.record.matchCount','10 partidos',{count:10})],['appearance50',copy('career.record.matchCount','50 partidos',{count:50})],['appearance100',copy('career.record.matchCount','100 partidos',{count:100})],['appearance500',copy('career.record.matchCount','500 partidos',{count:500})],['appearance700',copy('career.record.matchCount','700 partidos',{count:700})]])if(m[flag]===true)chips.push(label);
      milestoneCards.push(milestoneCard(copy('career.record.sportMilestones','Hitos deportivos'),{chips,rows:[[copy('career.record.matches','Partidos'),m.appearances],[copy('career.record.goals','Goles'),m.goals],[copy('career.record.assists','Asistencias'),m.assists]]}));
    }
    for(const m of v.ageMilestones)milestoneCards.push(milestoneCard(copy('career.profile.age',m.age+' años',{age:m.age}),{dateValue:m.date,summary:clubName(m.club)}));
    if(milestoneCards.length){
      const milestones=el('section',undefined,'career-section career-milestones-section');milestones.setAttribute('aria-labelledby','career-milestones-title');
      const head=el('div',undefined,'career-section-head'),title=el('h2',copy('career.record.milestones','Hitos'));title.id='career-milestones-title';head.append(title);milestones.append(head);
      const grid=el('div',undefined,'career-milestone-grid');for(const card of milestoneCards)grid.append(card);milestones.append(grid);main.append(milestones);
    }

    if(v.offerHistory.length){
      const offers=el('section',undefined,'career-section career-offers-section');offers.setAttribute('aria-labelledby','career-offers-title');
      const head=el('div',undefined,'career-section-head'),title=el('h2',copy('career.record.offers','Historial de ofertas'));title.id='career-offers-title';head.append(title);offers.append(head);
      const list=el('div',undefined,'career-offer-list');offerHistory(v,list);offers.append(list);main.append(offers);
    }

    const history=el('section',undefined,'career-section career-history-section');history.setAttribute('aria-labelledby','career-history-title');
    const historyHead=el('div',undefined,'career-section-head'),historyTitle=el('h2',copy('career.record.decisions','Decisiones y acciones'));historyTitle.id='career-history-title';historyHead.append(historyTitle);history.append(historyHead);
    const list=el('div',undefined,'timeline');
    const actionHistory=(v.actions?.history??[]).map(row=>presentationLocale?.presentPlayerActionHistory?.(row)??row);
    const timeline=[
      ...v.journal.map((row,index)=>({kind:'decision',date:row.date,index,row})),
      ...actionHistory.map((row,index)=>({kind:'action',date:row.date,index,row}))
    ].sort((a,b)=>a.date.localeCompare(b.date)||(a.kind===b.kind?a.index-b.index:(a.kind==='decision'?-1:1)));
    if(!timeline.length)list.append(el('p',copy('career.record.emptyHistory','Aún no hay decisiones ni acciones voluntarias registradas.'),'muted semantic-empty'));
    for(const entry of [...timeline].reverse()){
      if(entry.kind==='decision'){
        const row=entry.row,item=panel(row.title);item.dataset.journalIndex=String(entry.index);item.tabIndex=-1;item.prepend(el('time',date(row.date),'eyebrow'));item.append(el('p',row.choiceLabel,'chosen'));row.messages.forEach(m=>item.append(el('p',m,'muted')));list.append(item);
      }else{
        const row=entry.row,item=panel(row.actionLabel);item.prepend(el('time',date(row.date),'eyebrow'));item.append(el('p',copy('career.record.actionChoice','Acción voluntaria · '+row.optionLabel,{option:row.optionLabel}),'chosen'),el('p',row.text,'muted'));list.append(item);
      }
    }
    history.append(list);main.append(history);
  }
  function world(v,main){
    main.classList.add('p8-world');
    const intro=el('header',undefined,'world-intro');
    const currentDate=el('time',date(v.date),'eyebrow world-current-date');currentDate.dateTime=v.date;
    intro.append(el('span',copy('career.world.eyebrow','ACTUALIDAD DE TU MUNDO'),'eyebrow'),el('h1',copy('career.world.title','El mundo sigue')),currentDate,el('p',copy('career.world.intro','Noticias públicas que aparecen en tu carrera, ordenadas desde la más reciente.'),'muted'));
    main.append(intro);
    const feed=el('section',undefined,'world-feed');feed.setAttribute('aria-labelledby','world-news-title');
    const heading=el('div',undefined,'world-feed-header'),title=el('h2',copy('career.world.news','Noticias'));title.id='world-news-title';heading.append(title,el('span',copy('career.world.order','Más recientes primero'),'muted'));feed.append(heading);
    const news=el('div',undefined,'news-grid');
    if(!v.news.length){
      const empty=el('div',undefined,'world-empty semantic-empty');
      empty.append(el('strong',copy('career.world.empty','No hay noticias destacadas esta semana.')),el('p',copy('career.world.emptyHelp','Sigue simulando para ver las noticias públicas que genere tu historia.'),'muted'));news.append(empty);
    }
    for(const n of [...v.news].reverse()){const card=newsCard(n);if(card)news.append(card);}
    feed.append(news);main.append(feed);
  }
  function relations(v,main){
    main.classList.add('p8-relations');
    const intro=el('header',undefined,'relations-intro');
    intro.append(el('span',copy('career.relations.eyebrow','NADIE LLEGA SOLO'),'eyebrow'),el('h1',copy('career.relations.title','Las personas de tu historia')),el('p',copy('career.relations.intro','Personas que ya forman parte de tu carrera y el papel que ocupan en ella.'),'muted'));main.append(intro);
    const grid=el('div',undefined,'people-grid relations-grid');
    if(!v.contacts.length)grid.append(el('p',copy('career.relations.empty','Aún no hay personas registradas en esta etapa de tu historia.'),'muted semantic-empty relations-empty'));
    for(const c of v.contacts){const card=personCard(c);if(card)grid.append(card);}
    main.append(grid);
  }
  function profile(v,main){
    main.classList.add('p8-profile');
    const intro=el('header',undefined,'profile-intro');
    intro.append(el('span',copy('career.profile.eyebrow','EL PROTAGONISTA ERES TÚ'),'eyebrow'),el('h1',copy('career.profile.title','Tu perfil')),el('p',copy('career.profile.intro','Tu identidad, tu situación actual y tu contrato, usando únicamente datos de tu carrera.'),'muted'));main.append(intro);
    const grid=el('div',undefined,'profile-grid');grid.append(hero(v));
    const details=el('div',undefined,'profile-details');
    const identity=panel(copy('career.profile.now','En este momento'));identity.classList.add('profile-identity');
    const identityLabel=el('label',copy('career.profile.name','Nombre y apellido'),'file-label'),identityInput=el('input');
    identityInput.type='text';identityInput.value=profileNameDraft?.sessionId===v.sessionId?profileNameDraft.name:v.player.displayName;identityInput.dataset.entryField='profile-name';identityInput.setAttribute('aria-label',copy('career.profile.nameA11y','Nombre y apellido del jugador'));identityInput.addEventListener('input',()=>{profileNameDraft={sessionId:v.sessionId,name:identityInput.value};});identityInput.autocomplete='name';identityInput.setAttribute('aria-describedby','mh-player-name-help');
    const identityHelp=el('small',copy('career.profile.nameHelp','Entre 2 y 32 caracteres visibles. Se admiten tildes, apóstrofos y guiones.'),'muted');identityHelp.id='mh-player-name-help';
    identityLabel.append(identityInput,identityHelp);identity.append(identityLabel,button(copy('career.profile.saveName','Guardar nombre'),()=>run('identity',{displayName:identityInput.value}),'secondary'));
    for(const [label,value]of[[copy('career.profile.ageLabel','Edad'),copy('career.profile.age',v.age+' años',{age:v.age})],[copy('career.profile.position','Posición'),position(v)],[copy('career.profile.matches','Partidos'),v.appearances]]){const r=semanticRow(label,value);if(r)identity.append(r);}
    const moment=stats(v,false,true),contract=contractSummary(v);
    details.append(identity,moment,contract);grid.append(details);main.append(grid);
  }
  async function download(){try{const raw=await store.readRaw();if(!raw)throw Error('No hay una partida guardada.');downloadText(raw,'elevenfate-partida.json');}catch(e){message=e.message;render();}}
  function downloadText(raw,filename){if(win.AndroidBridge?.saveTextFile){win.AndroidBridge.saveTextFile(filename,raw);return;}const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=el('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  async function importFile(file){if(!file||busy)return;busy=true;busyKind='write';busyLabel='Comprobando la copia…';message='';render();try{if(file.size>8*1024*1024)throw Error('La copia supera 8 MiB.');const raw=await file.text();const candidate=await GameSession.migrateFromSave(raw,{...sessionOptions,commit});const previous=await store.readRaw();busy=false;render();confirmReplace('Recuperar esta copia',`Partida del ${date(candidate.getView().date)}, con ${decisionCount(candidate.getView().decisionsMade)}. Se conservará una copia de la partida actual.`,async()=>{
      await store.write(candidate.exportSnapshot(),previous);savedRaw=JSON.stringify(candidate.exportSnapshot());session=candidate;view='home';cinematic=false;replaceRouteState();
    },{titleKey:'career.save.restore',bodyKey:'career.save.restoreBody',bodyParameters:()=>({date:date(candidate.getView().date),count:decisionCount(candidate.getView().decisionsMade)})});}catch(e){message='No se pudo importar. '+e.message;busy=false;render();}}
  function confirmReplace(title,body,accept,{titleKey,bodyKey,bodyParameters}={}){
    const dialog=el('dialog',undefined,'dialog'),heading=el('h2'),description=el('p'),actions=el('div',undefined,'dialog-actions');
    const cancel=button(copy('career.cancel','Cancelar'),()=>dialog.close());
    const confirm=button(copy('career.confirm','Confirmar'),async()=>{if(busy)return;dialog.close();busy=true;busyKind='write';busyLabel='Guardando tu historia…';message='';render();try{await accept();}catch(e){message=e.message;}finally{busy=false;render();}},'primary');
    activeDialogLocale=()=>{dialog.lang=locale();heading.textContent=titleKey?copy(titleKey,title):title;description.textContent=bodyKey?copy(bodyKey,body,typeof bodyParameters==='function'?bodyParameters():bodyParameters):body;cancel.firstChild.textContent=copy('career.cancel','Cancelar');confirm.firstChild.textContent=copy('career.confirm','Confirmar');};
    activeDialogLocale();dialog.append(heading,description);actions.append(cancel,confirm);dialog.append(actions);shell.append(dialog);
    dialog.addEventListener('close',()=>{activeDialogLocale=null;dialog.remove();if(presentationLocale&&!disposed&&!busy)render();});dialog.showModal();
  }
  async function startNewStory(){
    if(busy)return;
    const displayName=newStoryDraft.displayName,seedText=newStoryDraft.seed.trim(),selected=Number(seedText);
    if(!displayName.trim()){message='Introduce el nombre del jugador para empezar otra carrera.';render();return;}
    if(!seedText||!Number.isSafeInteger(selected)||selected<0||selected>4294967295){message='Introduce un código de historia entre 0 y 4294967295.';render();return;}
    busy=true;busyKind='write';busyLabel='Comprobando tu partida…';message='';render();
    let old;
    try{old=await store.readRaw();}catch(e){message=e.message;busy=false;render();return;}
    busy=false;render();
    const accept=async()=>{replacement=old;session=await GameSession.create(selected,{...sessionOptions,commit,playerDisplayName:displayName});newStoryDraft={displayName:'',seed:'424242'};newStoryAdvancedOpen=false;view='home';cinematic=false;replaceRouteState();};
    if(old!==null){confirmReplace('Empezar otra carrera','La partida actual pasará a la copia anterior.',accept,{titleKey:'career.new.replace',bodyKey:'career.new.replaceBody'});return;}
    busy=true;busyKind='write';busyLabel='Creando tu carrera…';render();
    try{await accept();}catch(e){message=e.message;}finally{busy=false;render();}
  }
  function newStoryPanel({compact=false}={}){
    const n=panel(compact?copy('career.new.player','Tu jugador'):copy('career.new.other','Otra historia'));n.classList.add('save-new-story');
    if(!compact)n.append(el('p',copy('career.new.otherIntro','Empieza una carrera distinta usando un nombre y un código de historia. Conservaremos una copia si ya tienes una carrera.'),'muted'));
    const fields=el('div',undefined,'save-new-fields');
    const nameLabel=el('label',copy('career.new.name','Nombre y apellido'),'file-label'),name=el('input');name.type='text';name.autocomplete='name';name.value=newStoryDraft.displayName;name.dataset.entryField='name';name.setAttribute('aria-label',copy('career.new.nameA11y','Nombre y apellido de la nueva carrera'));name.addEventListener('input',()=>{newStoryDraft.displayName=name.value;});nameLabel.append(name);fields.append(nameLabel);
    const codeLabel=el('label',copy('career.new.code','Código de historia'),'file-label'),seed=el('input');seed.type='number';seed.min='0';seed.max='4294967295';seed.value=newStoryDraft.seed;seed.dataset.entryField='code';seed.setAttribute('aria-label',copy('career.new.codeA11y','Código de historia de la nueva carrera'));seed.addEventListener('input',()=>{newStoryDraft.seed=seed.value;});codeLabel.append(seed);
    if(compact){const advanced=el('details',undefined,'new-story-advanced');advanced.open=newStoryAdvancedOpen;advanced.addEventListener('toggle',()=>{newStoryAdvancedOpen=advanced.open;});advanced.append(el('summary',copy('career.new.advanced','Opciones de historia')),el('p',copy('career.new.codeHelp','El mismo código permite reproducir esta historia desde el inicio.'),'muted'),codeLabel);fields.append(advanced);}else fields.append(codeLabel);
    n.append(fields,button(compact?copy('career.new.start','Empezar mi carrera'):copy('career.new.replace','Empezar otra carrera'),startNewStory,'primary'));return n;
  }
  function newStory(v,main){
    main.classList.add('new-story-entry');main.append(el('h1',copy('career.new.title','Nueva partida')),el('p',copy('career.new.intro','Elige el nombre de tu futbolista.'),'muted'),newStoryPanel({compact:true}));
    if(onMenu)main.append(button(copy('career.cancel','Cancelar'),requestMenu,'secondary',{allowDuringRead:true}));
  }
  function saves(v,main){
    main.classList.add('p8-save');
    const intro=el('header',undefined,'save-intro');
    intro.append(el('span',copy('career.save.eyebrow','CONTINÚA DONDE LO DEJASTE'),'eyebrow'),el('h1',copy('career.save.title','Tu partida')),el('p',saveDescription==='reddit'?copy('career.save.redditIntro','Tu carrera se guarda en esta comunidad de Reddit. Continúa desde otro dispositivo con la misma cuenta.'):copy('career.save.localIntro','Gestiona la copia local de esta carrera, recupera una copia existente o empieza otra historia.'),'muted'));main.append(intro);
    const build=globalThis.ELEVENFATE_BUILD_INFO;
    if(build){const info=el('p',`ELEVENFATE ${build.appVersion} · Build ${build.buildId}`,'muted build-info');info.title=`Motor ${build.engineVersion} · Catálogo ${build.catalogVersion}`;intro.append(info);}

    const current=panel(copy('career.save.current','Partida actual'));current.classList.add('save-current');
    current.append(el('p',v?`${date(v.date)} · ${decisionCount(v.decisionsMade)}`:copy('career.save.unopened','Partida sin abrir'),'save-current-meta'));
    if(v)current.append(el('p',copy('career.save.latest','Es el último estado guardado de esta carrera.'),'muted'));
    const currentActions=el('div',undefined,'save-actions save-current-actions');
    currentActions.append(button(copy('career.save.download','Descargar copia'),download,'primary'),button(v?copy('career.save.reload','Recuperar partida actual'):copy('career.save.retry','Reintentar carga'),load));
    current.append(currentActions);if(v)current.append(el('p',copy('career.save.automatic','Guardado automático activo'),'save-auto-status'));main.append(current);

    const recovery=panel(copy('career.save.recovery','Copias y recuperación'));recovery.classList.add('save-recovery');
    recovery.append(el('p',saveDescription==='reddit'?copy('career.save.redditRecovery','Puedes descargar una copia o recuperar una anterior. Antes de sustituir tu carrera se mostrará una confirmación.'):copy('career.save.localRecovery','Estas opciones trabajan únicamente con copias locales de tu partida. Antes de sustituirla se mostrará una confirmación.'),'muted'));
    const support=el('div',undefined,'save-support-grid');

    const importBlock=el('section',undefined,'save-support-card save-import');
    importBlock.append(el('h3',copy('career.save.import','Importar una copia')),el('p',copy('career.save.importHelp','Selecciona una copia JSON compatible para recuperarla en este dispositivo.'),'muted'));
    const input=el('input');input.type='file';input.accept='.json,application/json';input.id='mh-import';input.setAttribute('aria-label',copy('career.save.importA11y','Importar copia de partida'));input.addEventListener('change',()=>importFile(input.files[0]));
    const label=el('label',copy('career.save.importA11y','Importar copia de partida'),'file-label');label.append(input);importBlock.append(label);support.append(importBlock);

    if(hasBackup()){
      const previous=el('section',undefined,'save-support-card save-backup');previous.append(el('h3',copy('career.save.previous','Copia anterior')),el('p',copy('career.save.previousHelp','Estado anterior de recuperación. Si lo restauras, volverás a ese punto y la partida actual quedará protegida durante la sustitución.'),'muted'),button(copy('career.save.restorePrevious','Recuperar copia anterior'),async()=>{try{const raw=await store.previous();if(!raw)throw Error('No hay copia anterior.');await importFile(new File([raw],'anterior.json',{type:'application/json'}));}catch(e){message=e.message;render();}}));support.append(previous);
    }

    const legacy=store.legacyRaw();
    if(legacy){
      const old=el('section',undefined,'save-support-card save-legacy');old.append(el('h3',copy('career.save.legacy','Copia antigua')),el('p',copy('career.save.legacyHelp','Procede del sistema de guardado anterior. Descargarla no restaura ni sustituye tu partida actual.'),'muted'),button(copy('career.save.downloadLegacy','Descargar copia antigua'),()=>downloadText(legacy,'elevenfate-copia-antigua.json')));support.append(old);
    }
    recovery.append(support);main.append(recovery);

    main.append(newStoryPanel());
    if(store.remove){
      const privacy=panel(copy('career.save.delete','Eliminar tu carrera'));
      privacy.append(el('p',copy('career.save.deleteHelp','Elimina de esta comunidad tu carrera y su copia anterior. Descarga una copia antes si quieres conservarla.'),'muted'),button(copy('career.save.deleteAction','Eliminar carrera de Reddit'),()=>confirmReplace(copy('career.save.deleteAction','Eliminar carrera de Reddit'),'Se eliminarán tu partida y su copia anterior. Esta acción no se puede deshacer sin una exportación.',async()=>{await store.remove();suspendAutoScheduler();session=null;savedRaw=null;replacement=null;message='Carrera eliminada. Puedes empezar otra cuando quieras.';view='save';},{titleKey:'career.save.deleteAction',bodyKey:'career.save.deleteConfirm'})));
      main.append(privacy);
    }
    if(win.AndroidBridge?.getAdStatus){
      const privacy=panel('Privacidad');
      privacy.append(el('p','Adapta las opciones de privacidad a tu grupo de edad.','muted'),button('Grupo de edad',()=>win.AndroidBridge.showAgeOptions()));
      let adState={};try{adState=JSON.parse(win.AndroidBridge.getAdStatus());}catch{}
      if(adState.privacyPolicyAvailable)privacy.append(button('Política de privacidad',()=>win.AndroidBridge.openPrivacyPolicy()));
      if(adState.privacyRequired)privacy.append(button('Opciones de anuncios',()=>win.AndroidBridge.showPrivacyOptions()));
      main.append(privacy);
      if(adState.testMode){
        const diagnostics=panel('Anuncios de prueba');
        diagnostics.append(el('p',adState.message||'Publicidad contextual de prueba disponible para todas las edades.','muted'));
        if(adState.ageEligible){
          diagnostics.append(button(adState.protectedFormat?'Probar anuncio protegido':'Probar anuncio intersticial',()=>win.AndroidBridge.testInterstitial()));
          if(!adState.protectedFormat)diagnostics.append(button('Probar vídeo recompensado',()=>win.AndroidBridge.testRewarded()),el('p','El vídeo solo verifica la integración. No cambia tu partida.','muted'));
        }
        main.append(diagnostics);
      }
    }
  }
  function render(focus=false){activeDialogLocale=null;disposeCutscene?.();disposeCutscene=null;if(autoVisualTimer!==null){clearTimeout(autoVisualTimer);autoVisualTimer=null;}const v=session?.getView();shell.replaceChildren();const frame=doc.createDocumentFragment();shell.classList.toggle('immersive',cinematic&&!!v);shell.classList.toggle('create-entry',view==='new');shell.lang=locale();const header=el('header',undefined,'topbar');const brand=el('div',undefined,'brand');brand.append(assets.brand_emblem?photo('brand_emblem','brand-emblem'):el('span','E','brand-mark'));const name=el('div');name.append(el('strong','ELEVENFATE'),el('small',copy('career.header.subtitle','Carrera de futbolista')));brand.append(name);const simMode=v?.simulation?.mode;const pause=v&&['auto_simulating','paused'].includes(simMode)?button(simMode==='paused'?copy('career.home.shortResume','Reanudar'):copy('career.home.shortPause','Pausar'),pauseToggle,'secondary',{ariaLabel:simMode==='paused'?copy('career.home.resumeA11y','Reanudar la simulación'):copy('career.home.pauseA11y','Pausar la simulación'),pressed:simMode==='paused'}):null;if(pause){pause.classList.add('pause-button');pause.dataset.localeFocus='pause';}const dateControl=button(v?copy('career.header.saveDate',date(v.date)+' · Partida',{date:date(v.date)}):copy('career.header.save','Tu partida'),()=>navigate('save'),'date-button',{ariaLabel:v?copy('career.header.saveDateA11y','Abrir Tu partida y el contexto de guardado de '+date(v.date),{date:date(v.date)}):copy('career.header.saveA11y','Abrir Tu partida')});dateControl.dataset.localeFocus='save-context';let saveContext=dateControl;if(compactHome){saveContext=el('div',undefined,'reddit-save-context');const sync=el('span',busy?busyCopy():'','reddit-save-indicator');sync.setAttribute('role','status');sync.setAttribute('aria-live','polite');sync.dataset.pending=String(busy);saveContext.append(dateControl,sync);}if(onMenu){const menu=button(copy('career.header.cover','Portada'),requestMenu,'secondary',{ariaLabel:copy('career.header.coverA11y','Volver a portada'),allowDuringRead:true});menu.dataset.localeFocus='cover';header.append(menu);}
    header.append(brand,el('span',v?copy('career.header.season','Temporada '+v.season.replace('-',' / 20'),{season:v.season.replace('-',' / 20')}):copy('career.header.tagline','Una vida. Mil decisiones.'),'chapter'),...(pause?[pause]:[]),saveContext);frame.append(header);
    const nav=el('nav',undefined,'navigation');nav.setAttribute('aria-label',copy('career.nav.a11y','Navegación principal'));for(const [key,label]of[['home','Inicio'],['career','Carrera'],['world','Mundo'],['relations','Relaciones'],['profile','Perfil'],['save','Tu partida']]){const b=button(copy('career.nav.'+key,label),()=>navigate(key),'nav-button');b.dataset.localeFocus='nav-'+key;b.prepend(icon(key));if(key===view){b.classList.add('active');b.setAttribute('aria-current','page');}nav.append(b);}const foot=el('div',undefined,'nav-foot');foot.append(el('span',copy('career.nav.tagline','Cada elección cuenta.')),el('small',copy('career.nav.end','De principio a fin.')));nav.append(foot);frame.append(nav);
    const main=el('main');main.tabIndex=0;main.setAttribute('aria-busy',String(busy));frame.append(main);
    if(v){if(cinematic&&['decision','result','offer'].includes(v.screen))renderDecision(v,main);else({home,career,world,relations,profile,save:saves,new:newStory})[view](v,main);}else if(view==='save')saves(null,main);else if(view==='new')newStory(null,main);else{const cover=el('section',undefined,'brand-welcome');if(assets.brand_cover)cover.append(photo('brand_cover','brand-cover'));cover.append(el('h1','Tu historia está a punto de empezar'),el('p','Tu carrera. Tu destino.','muted'));main.append(cover);}
    if(message){const alert=el('div',undefined,'alert');alert.setAttribute('role','alert');alert.append(el('p',messageCopy()),button(copy('career.header.save','Tu partida'),()=>navigate('save')));frame.append(alert);}
    if(busy){if(!compactHome){const status=el('div',busyCopy(),'busy-status');status.setAttribute('role','status');frame.append(status);}}else if(paused||v?.simulation?.mode==='paused'){const status=el('div',copy('career.home.pausedStatus','Juego en pausa · reanuda cuando quieras.'),'pause-status');status.setAttribute('role','status');frame.append(status);}else if(v?.simulation?.mode==='auto_simulating'){const status=el('div',copy('career.home.simulatingStatus','Simulando el siguiente tramo…'),'save-status');frame.append(status);}else{const status=el('div',session?copy('career.autosave','Guardado automático · '+decisionCount(v?.decisionsMade||0),{count:decisionCount(v?.decisionsMade||0)}):'','save-status');frame.append(status);}
    if(v&&['auto_simulating','paused'].includes(v.simulation?.mode)){const live=el('span',v.simulation.mode==='paused'?copy('career.home.pausedLive','Simulación pausada.'):copy('career.home.simulatingLive','Simulación en curso.'),'p5-live-status');live.setAttribute('role','status');live.setAttribute('aria-live','polite');frame.append(live);}
    shell.append(frame);if(v?.simulation?.mode==='auto_simulating')lastAutoVisualAt=performance.now();
    if(focus){const target=cinematic&&v?.screen==='result'?main.querySelector('[data-result-continue]'):main.querySelector('h1');if(target?.tagName==='H1')target.tabIndex=-1;(target||main).focus({preventScroll:true});main.scrollTop=0;}
  }
  function keyboard(e){if(e.key==='Escape'&&!shell.querySelector('dialog[open]')){e.preventDefault();goBack();}if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)&&e.target.closest('.choices,.navigation')){const group=e.target.closest('.choices,.navigation'),buttons=[...group.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(e.target.closest('button'));e.preventDefault();buttons[(index+(['ArrowDown','ArrowRight'].includes(e.key)?1:buttons.length-1))%buttons.length]?.focus();}}
  function popstate(e){const s=e.state;if(onMenu&&s?.efEntry&&s.efEntry!=='career')return;resetPlayerActions();if(!s?.mhOwner){view='home';cinematic=false;message='';render(true);return;}view=validViews.has(s.mhView)?s.mhView:'home';cinematic=Boolean(s.mhCinematic)&&Boolean(session&&['decision','result','offer'].includes(session.getView().screen));message='';render(true);}
  const adsstate=()=>{if(view==='save'&&!busy)render();};
  win.addEventListener?.('elevenfate:ads-state',adsstate);
  root.addEventListener('keydown',keyboard);win.addEventListener?.('popstate',popstate);win.addEventListener?.('muir:platform-pause',platformpause);win.addEventListener?.('muir:platform-resume',platformresume);doc.addEventListener('visibilitychange',visibilitychange);load();
  const unsubscribeLocale=presentationLocale?.subscribe(()=>{
    if(disposed)return;
    dateFormatter=new Intl.DateTimeFormat(locale()==='en'?'en-GB':'es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    moneyFormatter=new Intl.NumberFormat(locale()==='en'?'en-GB':'es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
    decimalFormatter=new Intl.NumberFormat(locale()==='en'?'en-GB':'es-ES',{maximumFractionDigits:1});
    if(activeDialogLocale){activeDialogLocale();return;}
    const active=doc.activeElement,field=active?.dataset?.entryField,start=active?.selectionStart,end=active?.selectionEnd,direction=active?.selectionDirection,focusKey=active?.dataset?.localeFocus;render();
    if(field)for(const input of shell.querySelectorAll('input'))if(input.dataset.entryField===field){input.focus();if(typeof start==='number'&&typeof end==='number')input.setSelectionRange?.(start,end,direction);}
    if(!field&&focusKey)for(const button of shell.querySelectorAll('button'))if(button.dataset.localeFocus===focusKey&&!button.disabled)button.focus({preventScroll:true});
  })||(()=>{});
  const dispose=()=>{disposed=true;unsubscribeLocale();activeDialogLocale=null;win.removeEventListener?.('elevenfate:ads-state',adsstate);disposeCutscene?.();clearTimeout(autoTimer);if(autoVisualTimer!==null)clearTimeout(autoVisualTimer);store.close().catch(()=>{});root.removeEventListener('keydown',keyboard);win.removeEventListener?.('popstate',popstate);win.removeEventListener?.('muir:platform-pause',platformpause);win.removeEventListener?.('muir:platform-resume',platformresume);doc.removeEventListener('visibilitychange',visibilitychange);shell.remove();style.remove();};
  dispose.canLeave=canLeaveEntry;
  dispose.getRouteState=routeState;
  return dispose;
}


