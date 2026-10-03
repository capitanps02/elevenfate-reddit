import {GameSession} from '../../dist/session/game-session.js';
import {mountGame} from '../../web/game-ui.js';
import css from '../../web/game-ui.css';
import {createRedditSaveStore} from './save-store.mjs';
import {createStoryScene} from './story-scene.mjs';
import {mountDaily} from './daily.mjs';
const host=document.querySelector('#game');
document.querySelector('#retry').addEventListener('click',()=>location.reload());
try{
  const [initResponse,assetsResponse]=await Promise.all([fetch('/api/init'),fetch('./assets.json')]);
  if(!initResponse.ok||!assetsResponse.ok)throw Error('No se pudo abrir el juego. Comprueba la conexión e inténtalo de nuevo.');
  const init=await initResponse.json(),assets=await assetsResponse.json();
  if(!init.userId){
    document.querySelector('#login-required').hidden=false;host.hidden=true;
  }else{
    const dailyButton=document.createElement('button');dailyButton.textContent='⚽ Daily · prueba';dailyButton.className='daily-entry';
    const dailyPanel=document.createElement('section');dailyPanel.className='daily-panel';dailyPanel.hidden=true;
    host.before(dailyButton,dailyPanel);
    dailyButton.addEventListener('click',()=>{
      host.hidden=true;dailyButton.hidden=true;dailyPanel.hidden=false;
      mountDaily({root:dailyPanel,onClose:()=>{dailyPanel.hidden=true;host.hidden=false;dailyButton.hidden=false;}});
    });
    const store=createRedditSaveStore({validate:raw=>GameSession.migrateFromSave(raw),storage:localStorage,cacheKey:`elevenfate.reddit.${init.subredditId}.${init.userId}.confirmed.v1`});
    mountGame({root:host.attachShadow({mode:'open'}),GameSession,assets,css,saveStore:store,saveDescription:'reddit',cutsceneFactory:createStoryScene,storageKey:`elevenfate.reddit.${init.subredditId}.${init.userId}`});
  }
}catch(error){
  const panel=document.querySelector('#load-error');panel.hidden=false;panel.querySelector('p').textContent=error.message;host.hidden=true;
}
