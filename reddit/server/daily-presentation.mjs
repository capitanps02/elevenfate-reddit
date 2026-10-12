// Public projection only: these identifiers never enter persisted run state.
export function publicDailyDecision(pending){
 if(pending?.kind!=='story')return null;
 return {eventId:pending.event.id,title:pending.event.text.title,body:pending.event.text.body,
  choices:pending.choices.map(choice=>({...choice})),original:pending.original};
}
export function publicDailyStage(stage,stageId){
 return stage?{...stage,stageId}:stage;
}
// The engine already records narrative IDs. Join by the fixed Daily cadence,
// with count/age checks, rather than matching translated text or changing saves.
export function publicDailyHistory(run,clubName){
 const entries=run.history??[],records=run.state?.history??[];
 const expected=entries.length-Math.ceil(entries.length/5);
 const storyEntries=entries.filter((_entry,index)=>index%5!==0);
 const valid=entries.length===run.resolved&&records.length===expected&&records.every((record,index)=>{
  const entry=storyEntries[index],dailyIndex=index+1+Math.floor(index/4);
  return record?.snapshot?.age===entry?.age&&[record.eventId,record.choiceId,record.outcomeId,record.club].every(id=>typeof id==='string'&&id.length>0)
   &&(entry.original!==false||record.eventId===`DAILY_${Math.floor(dailyIndex/5)}_${dailyIndex%5-1}`);
 });
 let cursor=0;
 return entries.map((entry,index)=>{
  let presentation=null;
  if(valid&&index%5===0){
   const current=records[cursor]?.club??run.state?.club,previous=cursor?records[cursor-1].club:null;
   const club=clubName(current);
   if(typeof club==='string')presentation={kind:'club',club,stay:previous===current};
  }else if(index%5!==0){
   const record=records[cursor++];
   if(valid&&record?.snapshot?.age===entry.age&&[record.eventId,record.choiceId,record.outcomeId].every(id=>typeof id==='string'&&id.length>0)){
    presentation={kind:'story',eventId:record.eventId,choiceId:record.choiceId,outcomeId:record.outcomeId};
   }
  }
  return {...entry,presentation};
 });
}
