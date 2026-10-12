import {translateDailyDivision,translateDailyFormat,translateDailyFixtureStage} from './daily-sports-locale.mjs';
import {MissingDailyTranslation} from './daily-story-locale.mjs';
export class MissingCareerSportsTranslation extends Error {
 constructor(cause){super('Career sports presentation unavailable',{cause});this.code='MISSING_CAREER_SPORTS_TRANSLATION';}
}
// Presentation copies only. Division and fixture IDs come from public projection.
export function presentCareerSports(sports,locale){
 if(locale==='es')return sports;
 try{
  const division=translateDailyDivision(sports,locale),cup=sports.continental;
  const continental=cup?{...cup,format:translateDailyFormat(cup,locale),matches:cup.matches.map(match=>({...match,...(match.stage?{stage:translateDailyFixtureStage(match,locale)}:{})}))}:cup;
  return {...sports,division,continental};
 }catch(error){if(error instanceof MissingDailyTranslation)throw new MissingCareerSportsTranslation(error);throw error;}
}
