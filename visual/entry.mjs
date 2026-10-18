// Capture harness: imports the shipped renderers. It contains no alternate screen markup.
import {GameSession} from '../dist/session/game-session.js';
import {mountCareerPresentation as mountGame} from '../reddit/client/career-presentation.mjs';
import {mountCover} from '../reddit/client/cover.mjs';
import {mountDaily} from '../reddit/client/daily.mjs';
import {createHelp} from '../reddit/client/help.mjs';
import {createStoryScene} from '../reddit/client/story-scene.mjs';
import {createTextExport} from '../reddit/client/text-export.mjs';
import {createRedditSaveStore} from '../reddit/client/save-store.mjs';
import {createBrowserLocale} from '../reddit/i18n/browser.mjs';
import {createCareerSportsView} from '../reddit/client/career-sports.mjs';
import {preservePresentation} from '../reddit/i18n/presentation.mjs';
import narrativeCatalog from '../reddit/i18n/narrative.generated.json' with {type:'json'};
const params=new URLSearchParams(location.search),id=params.get('case')||'06-inicio';
const spec=await (await fetch('/api/visual/case?id='+encodeURIComponent(id))).json();
document.documentElement.dataset.visualCase=id;
document.documentElement.dataset.visualBuild=__VISUAL_BUILD__;
const locale=createBrowserLocale();locale.addCatalog(narrativeCatalog);locale.set(params.get('lang')==='en'?'en':'es',{persist:false});
const request=(url,options)=>fetch(url+(url.includes('?')?'&':'?')+'visualcase='+encodeURIComponent(id),options);
const exportText=createTextExport({document,locale});
const help=createHelp({request,locale,exportText});help.setScope('visual.'+id);
const assets=await (await fetch('./assets.json')).json();
const host=document.querySelector('#game');
const cover=()=>{location.href='visual.html?case=01-portada';};
if(spec.kind==='cover'){
 host.removeAttribute('style');host.className='cover-host';
 mountCover({root:host,assets,locale,authenticated:true,readCareer:async()=>spec.fixture==='none'?null:'local-visual-fixture',onContinue(){location.href='visual.html?case=06-inicio';},onNew(){location.href='visual.html?case=05-nueva';},onDaily(){location.href='visual.html?case=19-daily-inicio';},onHelp:()=>help.open()});
}else if(spec.kind==='daily'){
 host.className='daily-panel';mountDaily({root:host,assets,locale,requester:request,showLanguageControl:false,returnTo:'cover',onClose:cover,onHelp:()=>help.open()});
}else if(spec.kind==='help'){
 host.className='cover-host';mountCover({root:host,assets,locale,authenticated:true,readCareer:async()=>null,onContinue(){},onNew(){},onDaily(){},onHelp:()=>help.open()});help.open();
}else{
 const shadow=host.attachShadow({mode:'open'});
 const store=createRedditSaveStore({request,validate:raw=>GameSession.migrateFromSave(raw,spec.eventsEmpty?{events:[]}:undefined)});
 mountGame({root:shadow,GameSession,...(spec.eventsEmpty?{events:[]}:{}),assets,locale,exportText,preservePresentation,showLanguageControl:false,showPauseControl:false,compactHome:true,initialView:spec.view||'home',autoCreateOnLoad:false,deferAutoResume:true,onMenu:cover,careerSports:createCareerSportsView(),saveStore:store,saveDescription:'reddit',cutsceneFactory:options=>createStoryScene({...options,locale})});
}
