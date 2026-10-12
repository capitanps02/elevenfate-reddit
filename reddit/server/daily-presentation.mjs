// Public projection only: these identifiers never enter persisted run state.
export function publicDailyDecision(pending){
 if(pending?.kind!=='story')return null;
 return {eventId:pending.event.id,title:pending.event.text.title,body:pending.event.text.body,
  choices:pending.choices.map(choice=>({...choice})),original:pending.original};
}
export function publicDailyStage(stage,stageId){
 return stage?{...stage,stageId}:stage;
}
