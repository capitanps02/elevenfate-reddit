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
function storyChoice(meta){
 const match=/^DAILY_([0-5])_([0-3])$/.exec(meta?.eventId??'');
 const label=match?en.fallbackChoices[match[2]+':'+meta.choiceId]:null;
 if(typeof label!=='string')throw new MissingDailyTranslation('choice/'+(meta?.eventId??'unknown')+'/'+meta?.choiceId);
 return label;
}
const format=(template,parameters)=>template.replace(/\{([A-Za-z0-9_]+)\}/g,(_match,key)=>String(parameters[key]));
export function translateDailyResult(text,presentation,locale){
 if(locale==='es'||!text)return text;
 if(locale!=='en')throw new MissingDailyTranslation('locale/'+locale);
 if(presentation?.kind==='club'&&typeof presentation.club==='string'&&typeof presentation.stay==='boolean'){
  return format(en.server[presentation.stay?'daily.clubStay':'daily.clubChange'],presentation);
 }
 if(presentation?.kind==='story'&&/^c[0-2]$/.test(presentation.choiceId)&&presentation.outcomeId==='o'+presentation.choiceId.slice(1)){
  return format(en.server['daily.fallbackOutcome'],{choice:storyChoice(presentation)});
 }
 throw new MissingDailyTranslation('result/'+(presentation?.eventId??'unknown'));
}
export function translateDailyHistory(entries,locale){
 if(locale==='es')return entries;
 if(locale!=='en')throw new MissingDailyTranslation('locale/'+locale);
 return entries.map(entry=>{
  const meta=entry.presentation;
  if(meta?.kind==='club')return {...entry,title:en.server['daily.pickClub'],choice:translateDailyResult(entry.choice,meta,locale)};
  const event=meta?.kind==='story'?en.fallbackEvents[meta.eventId]:null;
  if(!event)throw new MissingDailyTranslation('history/'+(meta?.eventId??'unknown'));
  return {...entry,title:event.title,choice:storyChoice(meta)};
 });
}

export function translateDailyPlayer(view,locale){
 if(locale==='es')return view;
 if(locale!=='en')throw new MissingDailyTranslation('locale/'+locale);
 if(view.clubStatus==='signed')return view;
 if(view.clubStatus==='unsigned')return {...view,club:en.server['daily.unsigned']};
 throw new MissingDailyTranslation('player/clubStatus');
}
