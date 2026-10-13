import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {EVENTS} from '../dist/content/events/index.js';
import {createLocale,exactInterfaceTranslation} from '../reddit/i18n/runtime.mjs';
import {legacyNarrativeSources,narrativeTexts} from './legacy-narrative-sources.mjs';
import {HELP_PAGES,HELP_VERSION} from '../reddit/shared/help-content.mjs';
import {SOURCE_HELP_HASH} from '../reddit/i18n/help-en.mjs';
const root=path.resolve(import.meta.dirname,'..');
if(createHash('sha256').update(JSON.stringify({version:HELP_VERSION,pages:HELP_PAGES})).digest('hex')!==SOURCE_HELP_HASH)throw Error('English help requires review of the changed Spanish source.');
const rows=EVENTS.map(event=>{
 const texts=narrativeTexts(event);
 return {id:event.id,sourceHash:createHash('sha256').update(JSON.stringify(texts)).digest('hex'),texts};
});
const legacySources=legacyNarrativeSources(root);
const activeTexts=new Set(rows.flatMap(row=>row.texts));
const allTexts=new Set([...activeTexts,...legacySources.flatMap(source=>source.events.flatMap(narrativeTexts))]);
const translations=JSON.parse(fs.readFileSync(path.join(root,'reddit/i18n/events-en.json'),'utf8')),catalog=Object.create(null),missing=[];
const directory=path.join(root,'reddit/i18n/event-translations');
if(fs.existsSync(directory))for(const file of fs.readdirSync(directory).filter(file=>file.endsWith('.json')).sort()){
 const chunk=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));
 for(const [id,translation] of Object.entries(chunk)){if(translations[id])throw Error('Duplicate translated event '+id);translations[id]=translation;}
}
for(const row of rows){
 const translation=translations[row.id];
 if(!translation)continue;
 if(translation.sourceHash!==row.sourceHash||translation.texts.length!==row.texts.length)throw Error('Narrative source changed: '+row.id);
 row.texts.forEach((source,i)=>{
  const translated=translation.texts[i];if(typeof translated!=='string'||!translated.trim())throw Error('Empty translation '+row.id);
  if(catalog[source]&&catalog[source]!==translated)throw Error('Conflicting narrative translation: '+source);
  catalog[source]=translated;
 });
}
const extras=JSON.parse(fs.readFileSync(path.join(root,'reddit/i18n/extra-en.json'),'utf8'));
const extrasDirectory=path.join(root,'reddit/i18n/extra-translations');
if(fs.existsSync(extrasDirectory))for(const file of fs.readdirSync(extrasDirectory).filter(file=>file.endsWith('.json')).sort()){
 const chunk=JSON.parse(fs.readFileSync(path.join(extrasDirectory,file),'utf8'));
 for(const [id,translation] of Object.entries(chunk)){
  if(Object.hasOwn(extras,id))throw Error('Duplicate extra translation '+id+' in '+file);
  extras[id]=translation;
 }
}
const sourceId=text=>createHash('sha256').update(text).digest('hex').slice(0,16);
for(const text of allTexts){const translation=extras[sourceId(text)];if(translation!==undefined){if(typeof translation!=='string'||!translation.trim())throw Error('Invalid extra translation');if(catalog[text]&&catalog[text]!==translation)throw Error('Conflicting extra translation '+text);catalog[text]=translation;}}
for(const text of allTexts){
 const interfaceTranslation=exactInterfaceTranslation(text);
 if(catalog[text]===undefined&&interfaceTranslation!==undefined)catalog[text]=interfaceTranslation;
 if(catalog[text]===undefined&&(/^[0-9\s.:/–-]+$/.test(text)||/^[A-Z][A-Z0-9_]+(?:\/[A-Z0-9_]+)*$/.test(text)))catalog[text]=text;
}
const suffixes=[
 [' El coste secundario queda registrado sin fabricar oferta, fichaje, minutos ni retirada.',' The secondary cost is recorded without creating an offer, signing, minutes or retirement.'],
 [' El resultado externo dependerá de lo que ocurra realmente después de esta conversación.',' The external outcome will depend on what actually happens after this conversation.'],
 [' Ningún hecho externo se crea desde la elección narrativa.',' The narrative choice creates no external facts.'],
 ['. La otra parte tendrá que responder antes de que sepas qué cambia de verdad.','. The other party will have to respond before you know what really changes.'],
 [' El resultado externo sigue perteneciendo a su authority factual.',' The external result remains governed by the system recording the actual facts.'],
 ['. La consecuencia se registra solo cuando el trigger factual canónico está acreditado.','. The consequence is recorded only once the required factual trigger has been confirmed.'],
];
for(const text of allTexts)for(const [sourceSuffix,englishSuffix] of suffixes){
 if(!text.endsWith(sourceSuffix))continue;
 const base=catalog[text.slice(0,-sourceSuffix.length)];
 if(base===undefined)continue;
 const translated=base+englishSuffix;
 if(catalog[text]!==undefined&&catalog[text]!==translated)throw Error('Conflicting composed narrative translation '+text);
 catalog[text]=translated;
}
for(const text of allTexts){
 if(catalog[text]===undefined&&text.endsWith('.')&&catalog[text.slice(0,-1)]!==undefined)catalog[text]=catalog[text.slice(0,-1)]+'.';
}
for(const row of rows)if(row.texts.some(text=>catalog[text]===undefined))missing.push(row.id);
createLocale({initial:'en'}).addCatalog(catalog);
fs.writeFileSync(path.join(root,'reddit/i18n/narrative.generated.json'),JSON.stringify(catalog)+'\n');
fs.writeFileSync(path.join(root,'reddit/i18n/narrative-inventory.json'),JSON.stringify(rows,null,2)+'\n');
const untranslated=[...allTexts].filter(text=>catalog[text]===undefined);
const legacyCoverage=legacySources.map(source=>({name:source.name,hash:source.hash,events:source.events.length,missing:[...new Set(source.events.flatMap(narrativeTexts))].filter(text=>catalog[text]===undefined).length}));
const coverage={events:rows.length,translatedEvents:rows.length-missing.length,activeStrings:activeTexts.size,translatedActiveStrings:[...activeTexts].filter(text=>catalog[text]!==undefined).length,totalStrings:allTexts.size,translatedStrings:Object.keys(catalog).length,missing,legacySources:legacyCoverage};
fs.writeFileSync(path.join(root,'reddit/i18n/coverage.json'),JSON.stringify(coverage,null,2)+'\n');
fs.writeFileSync(path.join(root,'reddit/i18n/missing-narrative.json'),JSON.stringify(untranslated.map(es=>({id:sourceId(es),es})),null,2)+'\n');
console.log(JSON.stringify({events:rows.length,translatedEvents:rows.length-missing.length,translatedActiveStrings:coverage.translatedActiveStrings,totalStrings:allTexts.size,translatedStrings:Object.keys(catalog).length,missingStrings:untranslated.length,legacySources:legacySources.length}));
if(process.argv.includes('--release')&&untranslated.length){console.error('English release blocked: incomplete active or historical narrative coverage.');process.exitCode=1;}
