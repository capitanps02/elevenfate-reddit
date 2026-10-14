import {createTextExport} from './text-export.mjs';
import {mountCover} from './cover.mjs';
import {createEntryNavigation} from './entry-navigation.mjs';
import {createAnalytics} from './analytics.mjs';
import {createAnalyticsPanel} from './analytics-panel.mjs';
import {GameSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import css from '../../web/game-ui.css';
import careerCss from './career.css';
import {createRedditSaveStore} from './save-store.mjs';
import {createStoryScene} from './story-scene.mjs';
import {mountDaily} from './daily.mjs';
import {readWithRetry} from './read-request.mjs';
import {createHelp} from './help.mjs';
import {createCareerSportsView} from './career-sports.mjs';
import {createBrowserLocale} from '../i18n/browser.mjs';
import {preservePresentation} from '../i18n/presentation.mjs';
import narrativeCatalog from '../i18n/narrative.generated.json' with {type:'json'};
const locale=createBrowserLocale();
locale.addCatalog(narrativeCatalog);
const exportText=createTextExport({document,locale});
let pageError=null,invalidated=false;
const pageCopy=[...document.querySelectorAll('.notice h1,.notice p,#retry,#help-data')].map(node=>[node,node.textContent]);
const renderPage=()=>{for(const [node,source] of pageCopy)node.textContent=locale.text(source);if(pageError)document.querySelector('#load-error p').textContent=locale.text(pageError);if(invalidated)document.querySelector('#load-error h1').textContent=locale.text('Vuelve a abrir ElevenFate');};
locale.subscribe(renderPage);renderPage();
const accessLanguage=locale.control(document);accessLanguage.element.classList.add('access-language');document.body.prepend(accessLanguage.element);
const host=document.querySelector('#game'),shadow=host.attachShadow({mode:'open'});
const cover=document.createElement('section'),dailyPanel=document.createElement('section');
cover.className='cover-host';dailyPanel.className='daily-panel';dailyPanel.hidden=true;host.hidden=true;host.before(cover,dailyPanel);
let disposeCareer=null,disposeDaily=null,disposeCover=null;
let sessionValid=true,channel,analytics;
const invalidate=()=>{analytics?.stop();sessionValid=false;disposeCareer?.();disposeDaily?.();disposeCover?.();cover.hidden=true;invalidated=true;pageError='Tus datos se han eliminado o la sesión ha caducado. Vuelve a abrir el juego para continuar.';host.hidden=true;accessLanguage.element.hidden=!locale.enabled;document.querySelector('.daily-panel')?.setAttribute('hidden','');document.querySelector('#load-error').hidden=false;document.querySelector('#help-data').hidden=false;renderPage();};
const help=createHelp({locale,exportText,request:(...args)=>fetch(...args),onDeleted:()=>{channel?.postMessage('deleted');invalidate();}});
document.querySelector('#help-data').addEventListener('click',()=>help.open());
document.querySelector('#retry').addEventListener('click',()=>location.reload());
try{
  const [initResponse,assetsResponse]=await Promise.all([readWithRetry('/api/init'),readWithRetry('./assets.json')]);
  if(!initResponse.ok||!assetsResponse.ok)throw Error('No se pudo abrir el juego. Comprueba la conexión e inténtalo de nuevo.');
  const init=await initResponse.json(),assets=await assetsResponse.json();
  const scope=`elevenfate.reddit.${init.subredditId}.${init.userId}`;
  const sessionRequest=(url,options={})=>{if(!sessionValid)throw Error('Sesión invalidada. Vuelve a abrir el juego.');return fetch(url,{...options,headers:{...options.headers,'X-ElevenFate-Session':init.session}});};
  help.setRequest(sessionRequest);
  if(init.userId){analytics=createAnalytics({request:sessionRequest});const panel=createAnalyticsPanel({request:sessionRequest,preview:init.preview===true});help.setAnalytics(analytics,()=>panel.open());}
  document.querySelector('#help-data').hidden=true;accessLanguage.element.hidden=true;
  if(init.userId){help.setScope(scope);if(typeof BroadcastChannel==='function'){channel=new BroadcastChannel(scope);channel.onmessage=event=>{if(event.data==='deleted'){try{for(const key of Object.keys(localStorage))if(key===scope||key.startsWith(scope+'.'))localStorage.removeItem(key);}catch{}invalidate();}};}}
  let storage;try{storage=localStorage;}catch{}
  const store=init.userId?createRedditSaveStore({observe:analytics?.observe,request:sessionRequest,validate:raw=>GameSession.migrateFromSave(raw),storage,cacheKey:scope+'.confirmed.v1'}):null;
 let shown='cover';
 const navigation=createEntryNavigation({window,onRoute(route,state){
  if(!sessionValid)return;
  if(!store&&route!=='cover'){showCover();return;}
  if(route==='cover'){showCover();return;}
  if(route==='career'&&shown==='daily'&&disposeCareer){disposeDaily?.();disposeDaily=null;dailyPanel.hidden=true;host.hidden=false;shown='career';window.dispatchEvent(new Event('muir:platform-resume'));const heading=shadow.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}return;}
  if(route==='career'){openCareer(state.mhView||'home',{push:false});return;}
  if(route==='daily')openDaily(state.origin||'cover',{push:false});
 },canLeave(route){return route==='career'?disposeCareer?.canLeave?.()!==false:route==='daily'?disposeDaily?.canLeave?.()!==false:true;},captureState(route){return route==='career'?disposeCareer?.getRouteState?.():null;}});
 function clearCover(){disposeCover?.();disposeCover=null;cover.hidden=true;}
 function showCover(){
  if(!sessionValid)return;analytics?.observe('screen','home');
  shown='cover';navigation.enter('cover',{push:false});
  disposeCareer?.();disposeCareer=null;disposeDaily?.();disposeDaily=null;disposeCover?.();
  host.hidden=true;dailyPanel.hidden=true;cover.hidden=false;
  disposeCover=mountCover({root:cover,assets,locale,onHelp:()=>help.open(),authenticated:!!init.userId,readCareer:()=>store.read(),onContinue:()=>openCareer('home'),onNew:()=>openCareer('new'),onDaily:()=>openDaily('cover')});
  const heading=cover.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 }
 function openCareer(initialView,{push=true}={}){
  if(!store||!sessionValid)return;
  navigation.enter('career',{push,context:{mhOwner:true,mhView:initialView,mhCinematic:false}});shown='career';
  clearCover();disposeDaily?.();disposeDaily=null;dailyPanel.hidden=true;host.hidden=false;
  disposeCareer?.();shadow.replaceChildren();
  disposeCareer=mountGame({observe:(...args)=>{if(!host.hidden&&!document.querySelector('dialog[open]'))analytics?.observe(...args);},root:shadow,GameSession,assets,locale,exportText,preservePresentation,showLanguageControl:false,showPauseControl:false,css:css+'\n'+careerCss,compactHome:true,initialView,autoCreateOnLoad:false,deferAutoResume:true,onMenu:showCover,careerSports:createCareerSportsView(),saveStore:store,saveDescription:'reddit',cutsceneFactory:options=>createStoryScene({...options,locale}),storageKey:`elevenfate.reddit.${init.subredditId}.${init.userId}`});
 }
 function openDaily(origin,{push=true}={}){
  if(!store||!sessionValid)return;analytics?.observe('screen','daily');
  if(origin==='cover'){clearCover();disposeCareer?.();disposeCareer=null;}
  navigation.enter('daily',{push,context:{origin}});shown='daily';
  // Suspend timers while a mounted career is hidden; do not change persisted game state.
  if(origin==='career')window.dispatchEvent(new Event('muir:platform-pause'));
  host.hidden=true;dailyPanel.hidden=false;disposeDaily?.();
  disposeDaily=mountDaily({root:dailyPanel,observe:analytics?.observe,requester:sessionRequest,onHelp:()=>help.open(),showLanguageControl:false,assets,locale,returnTo:origin,onClose(){if(disposeDaily?.canLeave?.()!==false)navigation.back(origin);}});
 }
 showCover();
}catch(error){
  disposeCareer?.();disposeDaily?.();disposeCover?.();cover.hidden=true;dailyPanel.hidden=true;pageError=error.message;const panel=document.querySelector('#load-error');panel.hidden=false;accessLanguage.element.hidden=!locale.enabled;host.hidden=true;renderPage();
}
