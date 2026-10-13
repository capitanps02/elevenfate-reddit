import {careerStoryContent} from '../i18n/career-story-content.mjs';

const sameLines=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&actual.every((line,i)=>line===expected[i]);
// IDs select the entry. Source comparisons only reject stale content; they never infer IDs.
// A missing translation preserves every original control and remains recoverable in ES.
export function presentCareerDecision(decision,locale){
 if(!decision||locale!=='en')return {decision,translated:false,reason:null};
 const es=Object.hasOwn(careerStoryContent.es,decision.eventId)?careerStoryContent.es[decision.eventId]:null;
 const en=Object.hasOwn(careerStoryContent.en,decision.eventId)?careerStoryContent.en[decision.eventId]:null;
 if(!es||!en)return {decision,translated:false,reason:'missing'};
 const choices=decision.choices;
 if(decision.title!==es.title||decision.body!==es.body||!sameLines(decision.visible,es.visible)||!sameLines(decision.uncertain,es.uncertain)||!Array.isArray(choices)||choices.some(choice=>!Object.hasOwn(es.choices,choice.id)||choice.label!==es.choices[choice.id]||typeof en.choices[choice.id]!=='string'))return {decision,translated:false,reason:'stale'};
 return {decision:{...decision,title:en.title,body:en.body,visible:[...en.visible],uncertain:[...en.uncertain],choices:choices.map(choice=>({...choice,label:en.choices[choice.id]}))},translated:true,reason:null};
}
