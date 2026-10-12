import {GameSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import css from '../../web/game-ui.css';
import careerCss from './career.css';
import {createRedditSaveStore} from './save-store.mjs';
import {createStoryScene} from './story-scene.mjs';
import {mountDaily} from './daily.mjs';
import {mountCover} from './cover.mjs';
import {readWithRetry} from './read-request.mjs';
import {createCareerSportsView} from './career-sports.mjs';
const host=document.querySelector('#game'),shadow=host.attachShadow({mode:'open'});
const cover=document.createElement('section'),dailyPanel=document.createElement('section');
dailyPanel.className='daily-panel';dailyPanel.hidden=true;host.hidden=true;
host.before(cover,dailyPanel);
document.querySelector('#retry').addEventListener('click',()=>location.reload());
let disposeCareer=null,disposeDaily=null,disposeCover=null;
try{
 const [initResponse,assetsResponse]=await Promise.all([readWithRetry('/api/init'),readWithRetry('./assets.json')]);
 if(!initResponse.ok||!assetsResponse.ok)throw Error('No se pudo abrir el juego. Comprueba la conexión e inténtalo de nuevo.');
 const init=await initResponse.json(),assets=await assetsResponse.json();
 let storage=null;try{storage=globalThis.localStorage;}catch{}
 const store=init.userId?createRedditSaveStore({validate:raw=>GameSession.migrateFromSave(raw),storage,cacheKey:`elevenfate.reddit.${init.subredditId}.${init.userId}.confirmed.v1`}):null;
 function clearCover(){disposeCover?.();disposeCover=null;cover.hidden=true;}
 function showCover(){
  disposeCareer?.();disposeCareer=null;disposeDaily?.();disposeDaily=null;disposeCover?.();
  host.hidden=true;dailyPanel.hidden=true;cover.hidden=false;
  disposeCover=mountCover({root:cover,assets,authenticated:!!init.userId,readCareer:()=>store.read(),onContinue:()=>openCareer('home'),onNew:()=>openCareer('save'),onDaily:()=>openDaily('cover')});
 }
 function openCareer(initialView){
  if(!store)return;
  clearCover();dailyPanel.hidden=true;host.hidden=false;
  disposeCareer?.();shadow.replaceChildren();
  disposeCareer=mountGame({root:shadow,GameSession,assets,css:css+'\n'+careerCss,compactHome:true,initialView,autoCreateOnLoad:false,deferAutoResume:true,onMenu:showCover,onDaily:()=>openDaily('career'),careerSports:createCareerSportsView(),saveStore:store,saveDescription:'reddit',cutsceneFactory:createStoryScene,storageKey:`elevenfate.reddit.${init.subredditId}.${init.userId}`});
 }
 function openDaily(origin){
  if(!store)return;
  if(origin==='cover')clearCover();
  // Suspend timers while a mounted career is hidden; do not change persisted game state.
  if(origin==='career')window.dispatchEvent(new Event('muir:platform-pause'));
  host.hidden=true;dailyPanel.hidden=false;disposeDaily?.();
  disposeDaily=mountDaily({root:dailyPanel,assets,onClose(){
   disposeDaily?.();disposeDaily=null;dailyPanel.hidden=true;
   if(origin==='career'){host.hidden=false;window.dispatchEvent(new Event('muir:platform-resume'));}
   else showCover();
  }});
 }
 showCover();
}catch(error){
 disposeCareer?.();disposeDaily?.();disposeCover?.();cover.hidden=true;dailyPanel.hidden=true;
 const panel=document.querySelector('#load-error');panel.hidden=false;panel.querySelector('p').textContent=error.message;host.hidden=true;
}
