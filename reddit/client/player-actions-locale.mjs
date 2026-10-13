import {playerActionContent as catalog} from '../i18n/player-action-content.mjs';
import {careerRecordCatalog} from '../i18n/career-record-catalog.mjs';
import {playerActionAvailability,playerActionTargetRoles,playerActionAvailabilityCopy as availabilityCopy} from '../i18n/player-action-availability.mjs';
const availabilityMessages=new Map(Object.values(playerActionAvailability).map(([es,en])=>[es,en]));
// The public date must match the whole canonical message. It is never used to decide availability.
export function presentPlayerActionAvailability(row,locale,cooldownUntil=row.cooldownUntil){
 if(locale==='es'||row.unavailableReason==null)return row;
 let reason=availabilityMessages.get(row.unavailableReason);
 if(!reason&&typeof cooldownUntil==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(cooldownUntil)&&row.unavailableReason===`Disponible de nuevo el ${cooldownUntil}.`)reason=availabilityCopy.cooldown(cooldownUntil);
 return {...row,unavailableReason:reason??availabilityCopy.detailsPending};
}
function presentTargetRole(target){
 const role=playerActionTargetRoles[target.id];
 return role&&target.role===role[0]?role[1]:availabilityCopy.rolePending;
}
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
// No engine imports or writes. Eligibility booleans, IDs, dates and values are copied intact.
export function presentPlayerActions(actions,locale){
 if(locale==='es')return actions;
 const presentOptions=(actionId,options,cooldownUntil)=>(options??[]).map(choice=>({...presentPlayerActionAvailability(choice,locale,cooldownUntil),label:option(actionId,choice.id,locale)[0]}));
 return {...presentPlayerActionAvailability(actions,locale),categories:actions.categories.map(category=>{
  if(!categories[category.id])throw new MissingPlayerActionTranslation('category/'+category.id);
  return {...category,label:categories[category.id],actions:category.actions.map(action=>{
   const translated=definition(action.id,locale);
   return {...presentPlayerActionAvailability(action,locale),label:translated.label,description:translated.description,options:presentOptions(action.id,action.options,action.cooldownUntil),targets:(action.targets??[]).map(target=>({...presentPlayerActionAvailability(target,locale),role:presentTargetRole(target),options:presentOptions(action.id,target.options,target.cooldownUntil)}))};
  })};
 }),history:(actions.history??[]).map(row=>presentPlayerActionHistory(row,locale)),lastResult:actions.lastResult?presentPlayerActionHistory(actions.lastResult,locale):null};
}

