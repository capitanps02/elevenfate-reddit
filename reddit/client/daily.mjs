import {createPresentationLocale} from './presentation-locale.mjs';
export function mountDaily({root,onClose,assets={},i18n=createPresentationLocale(),returnTo='career'}){
 let disposed=false;
 const t=(id,params)=>i18n.t(id,params);
 let state=null,busy=false,mode='daily',screen='play',error='',selected=null,pendingKind='read';
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const button=(text,action,cls='daily-button')=>{const el=node('button',text,cls);el.type='button';el.disabled=busy;if(action===onClose)el.dataset.dailyExit='true';el.addEventListener('click',action);return el;};
 function pending(){root.setAttribute('aria-busy',String(busy));for(const el of root.querySelectorAll('button,select'))el.disabled=busy&&!(el.dataset.dailyExit==='true'&&pendingKind==='read');const status=root.querySelector('.daily-status');if(status){status.textContent=busy?t(pendingKind==='write'?'daily.saving':'daily.loading'):error?(i18n.getLocale()==='es'?error:t('daily.openError')):'';status.classList.toggle('is-pending',busy);status.classList.toggle('is-error',!busy&&!!error);status.setAttribute('role',!busy&&error?'alert':'status');}for(const choice of root.querySelectorAll('[data-choice]'))choice.classList.toggle('selected',busy&&choice.dataset.choice===selected);}
 async function request(body,seasonId){if(disposed||busy)return;pendingKind=body?'write':'read';busy=true;error='';if(!state)render();pending();const previous=state;try{const response=await fetch(`/api/daily?mode=${mode}${seasonId?`&season=${encodeURIComponent(seasonId)}`:''}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify({...body,mode})}:{})});const data=await response.json();if(disposed)return;if(!response.ok)throw Error(data.error||t('daily.openError'));state={...data,...(mode==='daily'&&!data.leaderboard&&previous?.leaderboard?{leaderboard:previous.leaderboard}:{})};}catch(e){if(disposed)return;error=e.message;}busy=false;selected=null;render();}
 const act=command=>{selected=command.choiceId??null;return request({dailyId:state.config.id,action:'command',command:{...command,commandId:crypto.randomUUID(),expectedRevision:state.view.revision}});};
 const openRanking=()=>{mode='daily';screen='ranking';selected=null;return request();};
 function switchMode(){mode=mode==='daily'?'practice':'daily';screen='play';state=null;request();}
 function numbers(parent,stats){const list=node('div',undefined,'daily-numbers');for(const [key,label]of [['played',t('daily.matches')],['goals',t('daily.goals')],['assists',t('daily.assists')],['starts',t('daily.starts')]]){const item=node('div');item.append(node('strong',String(stats[key]??0)),node('span',label));list.append(item);}parent.append(list);}
 function honours(parent,title,items){const section=node('section',undefined,'daily-honours');section.append(node('h2',title));if(!items?.length)section.append(node('p',t('daily.noHonours')));else for(const item of items)section.append(node('p',`${item.title} · ${item.season}\n${item.club}`));parent.append(section);}
 function render(){
  if(disposed)return;
  root.replaceChildren();root.dataset.screen=screen;root.lang=i18n.getLocale();
  const header=node('header',undefined,'daily-header'),tools=node('div',undefined,'daily-tools'),ranking=button('Top',openRanking,'daily-icon daily-ranking-button'),help=button('?',()=>{screen=screen==='rules'?'play':'rules';render();},'daily-icon');ranking.setAttribute('aria-label',t('daily.rankingA11y'));help.setAttribute('aria-label',t('daily.helpA11y'));tools.append(ranking,help);header.append(button('←',onClose,'daily-icon'),node('strong',mode==='practice'?t('daily.practiceBrand'):'ELEVENFATE · DAILY'),tools);header.firstChild.setAttribute('aria-label',t(returnTo==='cover'?'daily.backMenu':'daily.back'));root.append(header);
  const done=state?.resolved??0,limit=state?.config.decisions??30,stage=state?.view?.stage;
  const timeline=node('div',undefined,'daily-timeline');timeline.append(node('span',stage?t('daily.stage',stage):t('daily.ageSpan')),node('span',`${done}/${limit}`));const progress=node('div',undefined,'daily-progress');for(let i=0;i<6;i++){const part=node('span');part.style.setProperty('--completion',`${Math.max(0,Math.min(100,(done-i*5)*20))}%`);progress.append(part);}progress.setAttribute('aria-label',t('daily.progress',{done,limit}));timeline.append(progress);root.append(timeline);
  const stageView=state?.view;if(state?.started){const bar=node('div',undefined,'daily-player');bar.append(node('strong',t('daily.player',stageView)),node('span',t('daily.playerStats',stageView)));root.append(bar);}else root.append(node('div',undefined,'daily-player'));
  const match=node('div',undefined,'daily-match'),card=node('section',undefined,'daily-card'),actions=node('footer',undefined,'daily-actions');match.append(card,actions);root.append(match);
  const title=(kicker,heading,body)=>{card.append(node('span',kicker,'daily-kicker'),node('h1',heading));if(body)card.append(node('p',body,'daily-story'));};
  if(['results','table','continental'].includes(screen)&&state?.view?.league){
   const league=state.view.league,c=state.view.continental;
   title(t('daily.mySeason'),screen==='table'?t('daily.leagueTable'):screen==='results'?t('daily.results'):t('daily.champions'),league.division);
   const select=node('select',undefined,'daily-season-select');select.setAttribute('aria-label',t('daily.chooseSeason'));for(const season of state.view.seasons){const option=node('option',`${season.id} · ${season.club}`);option.value=season.id;option.selected=season.id===league.id;select.append(option);}select.addEventListener('change',()=>request(undefined,select.value));select.disabled=busy;card.append(select);
   const tabs=node('nav',undefined,'daily-sports-tabs');for(const [id,label]of [['results',t('daily.results')],['table',t('daily.league')],['continental',t('daily.champions')]]){const b=button(label,()=>{screen=id;render();},'daily-link');b.setAttribute('aria-pressed',String(screen===id));tabs.append(b);}card.append(tabs);
   if(screen==='table'||screen==='continental'){
    const rows=screen==='table'?league.rows:c?.rows??[];
    if(screen==='continental'){card.append(node('p',c?.format??''));if(!c?.qualified)card.append(node('p',t('daily.notQualified')));if(c?.winner)card.append(node('p',t('daily.champion',{team:c.winner})));}
    if(rows.length){const table=node('table',undefined,'daily-league-table');const heading=node('tr');for(const text of ['#',t('daily.team'),t('daily.playedShort'),t('daily.goalDifferenceShort'),t('daily.pointsShort')])heading.append(node('th',text));table.append(heading);for(const row of rows){const line=node('tr',undefined,row.you?'your-team':'');for(const value of [row.position,row.name,row.played,row.gf-row.ga,row.points])line.append(node('td',String(value)));table.append(line);}card.append(table);}
   }
   if(screen!=='table'){
    const comp=screen==='results'?league:c,own=league.rows.find(r=>r.you)?.id,fixtures=comp?.matches.filter(m=>comp.teams[m.home].id===own||comp.teams[m.away].id===own)??[];
    if(!fixtures.length)card.append(node('p',t('daily.noFixtures')));
    for(const m of fixtures){const row=node('div',undefined,'daily-fixture');row.append(node('small',`${m.date} · ${m.stage??t('daily.round',{round:m.round})}`),node('span',`${comp.teams[m.home].name} ${m.hg===null?'vs':m.hg+'–'+m.ag} ${comp.teams[m.away].name}`));if(m.penalties)row.append(node('small',t('daily.penalties',m.penalties)));card.append(row);}
   }
   actions.append(button(t('daily.backCareer'),()=>{screen='play';render();},'daily-primary'));
  }else if(screen==='rules'){
   title(t('daily.howToPlay'),t('daily.lifeFootball'),t('daily.rulesIntro'));card.append(node('p',t('daily.rulesClubs')),node('p',t('daily.rulesDaily')),node('p',t('daily.rulesPoints')));actions.append(button(t('daily.backChallenge'),()=>{screen='play';render();},'daily-primary'),button(mode==='daily'?t('daily.toPractice'):t('daily.backDaily'),switchMode,'daily-link'));
  }else if(screen==='ranking'){
   const board=state?.leaderboard,day=state?.config?.day;title(t('daily.todayLeaderboard'),t('daily.todayLegacy'),day?t('daily.careersCompleted',{day:new Intl.DateTimeFormat(i18n.getLocale(),{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z')),total:board?.total??0}):t('daily.loadingRanking'));card.append(node('p',t('daily.rankingNote'),'daily-ranking-note'));if(board?.position){const own=node('div',undefined,'daily-own-rank');own.append(node('span',t('daily.yourPosition',board)),node('strong',`${board.score} pts`));card.append(own);}else if(state)card.append(node('p',t('daily.completeToRank')));if(state&&!board?.total)card.append(node('p',t('daily.noRunsToday')));else if(board?.total){card.append(node('h2',`Top ${Math.min(board.limit,board.total)}`));for(const row of board.rows){const line=node('div',undefined,'daily-rank'+(row.you?' your-score':''));line.append(node('span',`${row.position}. ${row.you?t('daily.you'):t('daily.playerGeneric')}`),node('strong',`${row.score} pts`));card.append(line);}}actions.append(button(t('daily.backDaily'),()=>{screen='play';render();},'daily-primary'),button(t('daily.refreshRanking'),()=>request(),'daily-link'));
  }else if(!state){title('DAILY',t('daily.preparing'));}
  else if(!state.started){
   const portrait=node('img',undefined,'daily-portrait');portrait.src=assets.hero_player??'./cover.png';portrait.alt='';card.append(portrait);title(t('daily.introEyebrow'),t('daily.introTitle'),t('daily.introBody'));actions.append(button(mode==='practice'?t('daily.startPractice'):t('daily.playDaily'),()=>request({dailyId:state.config.id,action:'start'}),'daily-primary'),button(mode==='daily'?t('daily.practiceFirst'):t('daily.backDaily'),switchMode,'daily-link'));
  }else if(state.finished){
   title(mode==='practice'?t('daily.practiceComplete'):t('daily.yourCareer'),t('daily.totalPoints',{score:state.score.total}),t('daily.legacy'));numbers(card,state.view.totals);honours(card,t('daily.teamTitles'),state.view.titles);honours(card,t('daily.individualAwards'),state.view.awards);
   const stages=node('details',undefined,'daily-details');stages.append(node('summary',t('daily.stageJourney')));for(const part of state.view.summaries){stages.append(node('h2',`${part.from}–${part.to} · ${part.club}`));numbers(stages,part);}card.append(stages);
   const history=node('details',undefined,'daily-details');history.append(node('summary',t('daily.storyChoices')));for(const entry of state.view.history??[])history.append(node('p',t('daily.historyEntry',entry)));card.append(history);
   if(mode==='daily'){card.append(node('p',state.leaderboard?.position?t('daily.rankingPosition',state.leaderboard):t('daily.rankRegistered'),'daily-ranking-note'));actions.append(button(t('daily.viewRanking'),openRanking,'daily-primary'));}else actions.append(button(t('daily.againPractice'),()=>request({dailyId:state.config.id,action:'restart',expectedRevision:state.view.revision}),'daily-primary'),button(t('daily.playDaily'),switchMode,'daily-link'));
  }else if(state.view.screen==='summary'){
   const part=state.view.summary;title(t('daily.stageAges',part),part.name,t('daily.startsPercent',part));numbers(card,part);if(part.titles.length)honours(card,t('daily.teamTitles'),part.titles);if(part.awards.length)honours(card,t('daily.individualAwards'),part.awards);actions.append(button(t('daily.nextStage',state.view.nextStage),()=>act({type:'acknowledge'}),'daily-primary'));
  }else if(state.view.screen==='club'){
   title(done===0?t('daily.firstContract'):t('daily.transferMarket'),done===0?t('daily.whereStart'):t('daily.stayOrGo'),done===0?t('daily.firstClubsIntro'):t('daily.transferIntro'));
   for(const club of state.view.clubs){const b=button('',()=>act({type:'choose',choiceId:club.id}),'daily-choice daily-club');b.dataset.choice=club.id;const copy=node('span');copy.append(node('strong',club.stay?t('daily.stayClub',{club:club.name}):club.name),node('small',t('daily.divisionRole',{tier:club.tier,role:club.role>=65?t('daily.roleStarter'):club.role>=40?t('daily.roleRotation'):t('daily.roleCompetition')})));b.append(node('span',club.stay?'↺':'→','daily-letter'),copy);actions.append(b);}
  }else{
   const decision=state.view.decision;title(t('daily.decisionIndex',{current:done+1,total:limit}),decision.title,decision.body);actions.setAttribute('aria-label',t('daily.decisionOptionsA11y'));for(const [i,choice]of decision.choices.entries()){const el=button('',()=>act({type:'choose',choiceId:choice.id}),'daily-choice');el.dataset.choice=choice.id;el.append(node('span',String.fromCharCode(65+i),'daily-letter'),node('span',choice.label));actions.append(el);}
  }
  if(screen==='play'&&state?.view?.league){card.append(button(t('daily.seasonResults'),()=>{screen='table';render();},'daily-link'));}
  if(state?.view?.lastMessage&&!state.finished&&state.view.screen!=='summary'){const note=node('div',undefined,'daily-consequence');note.append(node('span',t('daily.lastChoice')),node('p',state.view.lastMessage));card.append(note);}
  if(error)actions.append(button(t('daily.recover'),()=>request(),'daily-link'));const status=node('div',undefined,'daily-status');status.setAttribute('role','status');root.append(status);pending();root.scrollTop=0;
 }
 const unsubscribe=i18n.subscribe(()=>render());
 request();
 const dispose=()=>{disposed=true;unsubscribe();root.replaceChildren();};
 dispose.canLeave=()=>!busy||pendingKind==='read';
 return dispose;
}

