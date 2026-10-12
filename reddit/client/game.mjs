import {GameSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import css from '../../web/game-ui.css';
import careerCss from './career.css';
import {createRedditSaveStore} from './save-store.mjs';
import {createStoryScene} from './story-scene.mjs';
import {mountDaily} from './daily.mjs';
import {mountCover} from './cover.mjs';
import {createPresentationLocale} from './presentation-locale.mjs';
import {createEntryNavigation} from './entry-navigation.mjs';
import {readWithRetry} from './read-request.mjs';
import {createCareerSportsView} from './career-sports.mjs';
const host=document.querySelector('#game'),shadow=host.attachShadow({mode:'open'});
const cover=document.createElement('section'),dailyPanel=document.createElement('section');
cover.className='cover-host';dailyPanel.className='daily-panel';dailyPanel.hidden=true;host.hidden=true;
host.before(cover,dailyPanel);
document.querySelector('#retry').addEventListener('click',()=>location.reload());
let disposeCareer=null,disposeDaily=null,disposeCover=null;
try{
 const [initResponse,assetsResponse]=await Promise.all([readWithRetry('/api/init'),readWithRetry('./assets.json')]);
 if(!initResponse.ok||!assetsResponse.ok)throw Error('No se pudo abrir el juego. Comprueba la conexión e inténtalo de nuevo.');
 const init=await initResponse.json(),assets=await assetsResponse.json();
 let storage=null;try{storage=globalThis.localStorage;}catch{}
 const store=init.userId?createRedditSaveStore({validate:raw=>GameSession.migrateFromSave(raw),storage,cacheKey:`elevenfate.reddit.${init.subredditId}.${init.userId}.confirmed.v1`}):null;
 // English is deliberately gated until career/Daily coverage is complete.
 const presentationLocale=createPresentationLocale({storage,key:`elevenfate.reddit.${init.subredditId}.${init.userId||'anonymous'}.presentation.locale.v1`,availableLocales:['es']});
 let shown='cover';
 const navigation=createEntryNavigation({window,onRoute(route,state){
  if(!store&&route!=='cover'){showCover();return;}
  if(route==='cover'){showCover();return;}
  if(route==='career'&&shown==='daily'&&disposeCareer){disposeDaily?.();disposeDaily=null;dailyPanel.hidden=true;host.hidden=false;shown='career';window.dispatchEvent(new Event('muir:platform-resume'));const heading=shadow.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}return;}
  if(route==='career'){openCareer(state.mhView||'home',{push:false});return;}
  if(route==='daily')openDaily(state.origin||'cover',{push:false});
 },canLeave(route){return route==='career'?disposeCareer?.canLeave?.()!==false:route==='daily'?disposeDaily?.canLeave?.()!==false:true;},captureState(route){return route==='career'?disposeCareer?.getRouteState?.():null;}});
 function clearCover(){disposeCover?.();disposeCover=null;cover.hidden=true;}
 function showCover(){
  shown='cover';navigation.enter('cover',{push:false});
  disposeCareer?.();disposeCareer=null;disposeDaily?.();disposeDaily=null;disposeCover?.();
  host.hidden=true;dailyPanel.hidden=true;cover.hidden=false;
  disposeCover=mountCover({root:cover,assets,i18n:presentationLocale,authenticated:!!init.userId,readCareer:()=>store.read(),onContinue:()=>openCareer('home'),onNew:()=>openCareer('new'),onDaily:()=>openDaily('cover')});
  const heading=cover.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 }
 function openCareer(initialView,{push=true}={}){
  if(!store)return;
  navigation.enter('career',{push,context:{mhOwner:true,mhView:initialView,mhCinematic:false}});shown='career';
  clearCover();disposeDaily?.();disposeDaily=null;dailyPanel.hidden=true;host.hidden=false;
  disposeCareer?.();shadow.replaceChildren();
  disposeCareer=mountGame({root:shadow,GameSession,assets,css:css+'\n'+careerCss,compactHome:true,initialView,autoCreateOnLoad:false,deferAutoResume:true,onMenu:showCover,onDaily:()=>openDaily('career'),careerSports:createCareerSportsView(),saveStore:store,saveDescription:'reddit',cutsceneFactory:createStoryScene,storageKey:`elevenfate.reddit.${init.subredditId}.${init.userId}`});
 }
 function openDaily(origin,{push=true}={}){
  if(!store)return;
  if(origin==='cover'){clearCover();disposeCareer?.();disposeCareer=null;}
  navigation.enter('daily',{push,context:{origin}});shown='daily';
  // Suspend timers while a mounted career is hidden; do not change persisted game state.
  if(origin==='career')window.dispatchEvent(new Event('muir:platform-pause'));
  host.hidden=true;dailyPanel.hidden=false;disposeDaily?.();
  disposeDaily=mountDaily({root:dailyPanel,assets,i18n:presentationLocale,returnTo:origin,onClose(){if(disposeDaily?.canLeave?.()!==false)navigation.back(origin);}});
 }
 showCover();
}catch(error){
 disposeCareer?.();disposeDaily?.();disposeCover?.();cover.hidden=true;dailyPanel.hidden=true;
 const panel=document.querySelector('#load-error');panel.hidden=false;panel.querySelector('p').textContent=error.message;host.hidden=true;
}

