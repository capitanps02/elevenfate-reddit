import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {sourceRecordFromFixture} from './generate-t51-post-legacy-registry.mjs';
export function legacyNarrativeSources(root){
 const sources=[];
 for(const name of ['pre-t41-event-catalog.json','pre-t51-event-catalog.json']){
  const events=JSON.parse(fs.readFileSync(path.join(root,'qa/fixtures/t5.1',name),'utf8'));
  if(!Array.isArray(events))throw Error('Invalid frozen narrative source '+name);
  sources.push({name,hash:createHash('sha256').update(JSON.stringify(events)).digest('hex'),events});
 }
 const dir=path.join(root,'qa/fixtures/t5.1/post-t51-sources');
 for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.json')).sort()){
  const fixture=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),record=sourceRecordFromFixture(fixture,name);
  sources.push({name,hash:record.contentIdentity,events:fixture.events});
 }
 return sources;
}
export function narrativeTexts(event){
 const texts=[event.text.title,event.text.body,...event.intel.visible,...event.intel.uncertain,...event.choices.map(choice=>choice.label),...event.outcomes.flatMap(outcome=>outcome.messages)];
 if(texts.some(text=>typeof text!=='string'))throw Error('Unsupported narrative text '+event.id);
 return texts;
}
