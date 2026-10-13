import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameSession} from '../../dist/session/game-session.js';
import {playerActionAvailability,playerActionTargetRoles,playerActionAvailabilityCopy} from '../i18n/player-action-availability.mjs';
import {presentPlayerActions,presentPlayerActionAvailability} from '../client/player-actions-locale.mjs';

test('closed availability sources match the actual public engine wording and roles match the public registry',async()=>{
 const source=(await Promise.all(['../../src/player-actions/eligibility.ts','../../src/session/game-session.ts'].map(path=>readFile(new URL(path,import.meta.url),'utf8')))).join('\n');
 assert.equal(Object.keys(playerActionAvailability).length,13);
 for(const [id,[es,en]] of Object.entries(playerActionAvailability)){assert.ok(source.includes(JSON.stringify(es)),id);assert.ok(en.length>0);}
 const registry=await readFile(new URL('../../src/catalog/npcs.ts',import.meta.url),'utf8');
 for(const [id,[es,en]] of Object.entries(playerActionTargetRoles)){assert.match(registry,new RegExp('id: "'+id+'", name: "[^"]*", role: "'+es.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"'));assert.ok(en.length>0);}
});

test('every certified reason translates at session, action, option and target levels without changing eligibility or data',async()=>{
 const session=await GameSession.create(424242,{events:[]}),snapshot=JSON.stringify(session.exportSnapshot());
 for(const [es,en] of Object.values(playerActionAvailability)){
  const source=structuredClone(session.getView().actions);source.available=false;source.unavailableReason=es;
  for(const category of source.categories)for(const action of category.actions){action.available=false;action.unavailableReason=es;for(const option of action.options){option.available=false;option.unavailableReason=es;}for(const target of action.targets){target.available=false;target.unavailableReason=es;for(const option of target.options){option.available=false;option.unavailableReason=es;}}}
  const before=JSON.stringify(source),translated=presentPlayerActions(source,'en');assert.equal(translated.available,false);assert.equal(translated.unavailableReason,en);
  for(const category of translated.categories)for(const action of category.actions){assert.equal(action.available,false);assert.equal(action.unavailableReason,en);for(const option of action.options){assert.equal(option.available,false);assert.equal(option.unavailableReason,en);}for(const target of action.targets){assert.equal(target.available,false);assert.equal(target.unavailableReason,en);for(const option of target.options){assert.equal(option.available,false);assert.equal(option.unavailableReason,en);}}}
  assert.equal(JSON.stringify(source),before);assert.equal(presentPlayerActions(source,'es'),source);
 }
 assert.equal(JSON.stringify(session.exportSnapshot()),snapshot);
});

test('cooldown translation requires the exact whole message and matching public date; unknown reasons give honest guidance',()=>{
 const row={available:false,cooldownUntil:'2026-08-01',unavailableReason:'Disponible de nuevo el 2026-08-01.'};
 assert.equal(presentPlayerActionAvailability(row,'en').unavailableReason,'Available again on 2026-08-01.');
 for(const patch of [{cooldownUntil:null},{cooldownUntil:'2026-08-02'},{unavailableReason:'No permitido. Disponible de nuevo el 2026-08-01.'},{unavailableReason:'A future engine message.'}]){const source={...row,...patch},before=JSON.stringify(source),en=presentPlayerActionAvailability(source,'en');assert.equal(en.unavailableReason,playerActionAvailabilityCopy.detailsPending);assert.equal(en.available,false);assert.equal(JSON.stringify(source),before);assert.equal(presentPlayerActionAvailability(source,'es'),source);}
 for(const available of [true,false]){const row={available,unavailableReason:null};assert.equal(presentPlayerActionAvailability(row,'en'),row);}
});

test('target roles translate only certified public ID and source pairs, preserving names and selection identifiers',async()=>{
 const source=(await GameSession.create(424242,{events:[]})).getView().actions,action=source.categories.find(c=>c.id==='career').actions.find(a=>a.id==='PA_COACH_TALK');
 action.targets=Object.entries(playerActionTargetRoles).map(([id,[role]])=>({id,label:'Public name '+id,role,available:true,unavailableReason:null,cooldownUntil:null,options:action.options.map(o=>({...o,available:true,unavailableReason:null}))}));
 action.targets.push({id:'new-public-person',label:'New name',role:'Entrenador',available:false,unavailableReason:'Unknown reason.',cooldownUntil:null,options:[]});
 const before=JSON.stringify(source),en=presentPlayerActions(source,'en').categories.find(c=>c.id==='career').actions.find(a=>a.id===action.id);
 for(const [index,target] of en.targets.entries()){assert.equal(target.id,action.targets[index].id);assert.equal(target.label,action.targets[index].label);assert.equal(target.available,action.targets[index].available);assert.equal(target.role,playerActionTargetRoles[target.id]?.[1]??playerActionAvailabilityCopy.rolePending);}
 action.targets[0].role='Different current public role';assert.equal(presentPlayerActions(source,'en').categories.find(c=>c.id==='career').actions.find(a=>a.id===action.id).targets[0].role,playerActionAvailabilityCopy.rolePending);action.targets[0].role=playerActionTargetRoles[action.targets[0].id][0];assert.equal(JSON.stringify(source),before);
});
