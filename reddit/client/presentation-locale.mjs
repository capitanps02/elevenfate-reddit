import esBase from '../i18n/es.json' with {type:'json'};
import enBase from '../i18n/en.json' with {type:'json'};
import {coverCatalog} from '../i18n/cover-catalog.mjs';
import {dailyCatalog} from '../i18n/daily-catalog.mjs';
import {careerEntryCatalog} from '../i18n/career-entry-catalog.mjs';
import {careerSaveCatalog} from '../i18n/career-save-catalog.mjs';
import {careerHomeCatalog} from '../i18n/career-home-catalog.mjs';
import {presentCareerSports} from './career-sports-locale.mjs';
import {careerPanelsCatalog} from '../i18n/career-panels-catalog.mjs';
import {careerRecordCatalog} from '../i18n/career-record-catalog.mjs';
import {careerPeriodCatalog} from '../i18n/career-period-catalog.mjs';
import {careerInteractiveCatalog} from '../i18n/career-interactive-catalog.mjs';
import {careerStoryCatalog} from '../i18n/career-story-content.mjs';
import {presentCareerDecision} from './career-story-locale.mjs';
import {presentPlayerActions,presentPlayerActionHistory} from './player-actions-locale.mjs';
export const presentationCatalog={es:{...esBase.ui,...coverCatalog.es,...dailyCatalog.es,...careerEntryCatalog.es,...careerSaveCatalog.es,...careerHomeCatalog.es,...careerPanelsCatalog.es,...careerRecordCatalog.es,...careerPeriodCatalog.es,...careerInteractiveCatalog.es,...careerStoryCatalog.es},en:{...enBase.ui,...coverCatalog.en,...dailyCatalog.en,...careerEntryCatalog.en,...careerSaveCatalog.en,...careerHomeCatalog.en,...careerPanelsCatalog.en,...careerRecordCatalog.en,...careerPeriodCatalog.en,...careerInteractiveCatalog.en,...careerStoryCatalog.en}};
const normalize=value=>typeof value==='string'?({es:'es',en:'en'})[value.trim().toLowerCase().split('-')[0]]??null:null;
// Locale is presentation preference only. No engine, session, save or network imports.
export function createPresentationLocale({storage=null,key='elevenfate.presentation.locale.v1',availableLocales=['es'],initialLocale=null}={}){
 if(!availableLocales.includes('es')||availableLocales.some(locale=>!['es','en'].includes(locale)))throw Error('Invalid presentation locales');
 const available=new Set(availableLocales),listeners=new Set();let remembered=null;
 try{remembered=storage?.getItem(key);}catch{}
 let locale=normalize(initialLocale??remembered);if(!available.has(locale))locale='es';
 return {
  presentCareerDecision:decision=>presentCareerDecision(decision,locale),
  presentPlayerActions:actions=>presentPlayerActions(actions,locale),
  presentPlayerActionHistory:row=>presentPlayerActionHistory(row,locale),
  presentCareerSports:sports=>presentCareerSports(sports,locale),
  getLocale:()=>locale,isAvailable:value=>available.has(normalize(value)),
  setLocale(value){const next=normalize(value);if(!available.has(next))return false;const changed=next!==locale;locale=next;try{storage?.setItem(key,locale);}catch{}if(changed)for(const listener of [...listeners])listener(locale);return true;},
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  t(id,parameters={}){
   const template=presentationCatalog[locale][id];if(typeof template!=='string')throw Error('Missing presentation translation: '+locale+'/'+id);
   return template.replace(/\{([A-Za-z0-9_]+)\}/g,(_match,name)=>{if(!Object.hasOwn(parameters,name))throw Error('Missing translation parameter: '+name);return String(parameters[name]);});
  },
 };
}

