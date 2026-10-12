import en from '../i18n/en.json' with {type:'json'};
export class MissingDailyTranslation extends Error{
 constructor(key){super('Missing Daily translation: '+key);this.name='MissingDailyTranslation';this.key=key;}
}
// Translate by public IDs only. Canonical stories without coverage fail explicitly.
export function translateDailyDecision(decision,locale){
 if(locale==='es')return decision;
 if(locale!=='en')throw new MissingDailyTranslation('locale/'+locale);
 const match=/^DAILY_([0-5])_([0-3])$/.exec(decision?.eventId??'');
 const copy=match&&decision.original===false?en.fallbackEvents[decision.eventId]:null;
 if(!copy)throw new MissingDailyTranslation('event/'+(decision?.eventId??'unknown'));
 const choices=decision.choices.map(choice=>{
  const label=en.fallbackChoices[match[2]+':'+choice.id];
  if(typeof label!=='string')throw new MissingDailyTranslation(decision.eventId+'/choice/'+choice.id);
  return {...choice,label};
 });
 return {...decision,title:copy.title,body:copy.body,choices};
}
export function translateDailyStage(stage,locale){
 if(locale==='es'||!stage)return stage;
 if(locale!=='en'||!Number.isInteger(stage.stageId)||!Object.hasOwn(en.stages,String(stage.stageId)))throw new MissingDailyTranslation('stage/'+stage.stageId);
 return {...stage,name:en.stages[String(stage.stageId)]};
}
