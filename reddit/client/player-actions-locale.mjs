import {playerActionContent as catalog} from '../i18n/player-action-content.mjs';
import {careerRecordCatalog} from '../i18n/career-record-catalog.mjs';
const categories={career:'Career',training:'Training',health:'Health',representative:'Representative',relationships:'Relationships',image:'Public profile',life:'Life'};
export class MissingPlayerActionTranslation extends Error{constructor(id){super('Player action presentation unavailable: '+id);this.code='MISSING_PLAYER_ACTION_TRANSLATION';}}
const definition=(id,locale)=>{const value=catalog[locale]?.[id];if(!value)throw new MissingPlayerActionTranslation(id);return value;};
const option=(id,optionId,locale)=>{const value=definition(id,locale).options[optionId];if(!value)throw new MissingPlayerActionTranslation(id+'/'+optionId);return value;};
export function presentPlayerActionHistory(row,locale){
 if(locale==='es')return row;
 try{
  const action=definition(row.actionId,locale),choice=option(row.actionId,row.optionId,locale),source=option(row.actionId,row.optionId,'es');
  if(row.text!==source[1])throw new MissingPlayerActionTranslation(row.actionId+'/'+row.optionId+'/result');
  return {...row,actionLabel:action.label,optionLabel:choice[0],text:choice[1]};
 }catch(error){
  if(!(error instanceof MissingPlayerActionTranslation))throw error;
  const copy=careerRecordCatalog.en;
  return {...row,translationUnavailable:true,actionLabel:copy['actions.ui.recorded'],optionLabel:copy['actions.ui.detailsPending'],text:copy['actions.ui.translationPending']};
 }
}
// No engine imports or writes. Availability, targets, IDs, dates and values are copied intact.
export function presentPlayerActions(actions,locale){
 if(locale==='es')return actions;
 const presentOptions=(actionId,options)=>(options??[]).map(choice=>({...choice,label:option(actionId,choice.id,locale)[0]}));
 return {...actions,categories:actions.categories.map(category=>{
  if(!categories[category.id])throw new MissingPlayerActionTranslation('category/'+category.id);
  return {...category,label:categories[category.id],actions:category.actions.map(action=>{
   const translated=definition(action.id,locale);
   return {...action,label:translated.label,description:translated.description,options:presentOptions(action.id,action.options),targets:(action.targets??[]).map(target=>({...target,options:presentOptions(action.id,target.options)}))};
  })};
 }),history:(actions.history??[]).map(row=>presentPlayerActionHistory(row,locale)),lastResult:actions.lastResult?presentPlayerActionHistory(actions.lastResult,locale):null};
}
