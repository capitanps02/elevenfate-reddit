import {dailySportsEnglish as catalog} from '../i18n/daily-sports-catalog.mjs';
import {MissingDailyTranslation} from './daily-story-locale.mjs';
const lookup=(group,id)=>{const value=catalog[group][id];if(typeof value!=='string')throw new MissingDailyTranslation(group+'/'+id);return value;};
function translated(locale,original,group,id){
 if(locale==='es')return original;
 if(locale==='en')return lookup(group,id);
 throw new MissingDailyTranslation('locale/'+locale);
}
export const translateDailyDivision=(league,locale)=>translated(locale,league.division,'divisions',league.divisionId);
export const translateDailyHonour=(item,locale)=>translated(locale,item.title,'honours',item.honourId);
export const translateDailyFormat=(continental,locale)=>translated(locale,continental.format,'formats',continental.formatId);
export function translateDailyFixtureStage(match,locale){
 if(locale==='es')return match.stage;
 if(locale!=='en')throw new MissingDailyTranslation('locale/'+locale);
 if(!match.stage)return undefined;
 if(match.stageId==='group'&&Number.isInteger(match.group)&&match.group>=0&&match.group<8)return lookup('stages','group').replace('{group}',String.fromCharCode(65+match.group));
 return lookup('stages',match.stageId);
}
