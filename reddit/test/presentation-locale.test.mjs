import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationLocale,presentationCatalog} from '../client/presentation-locale.mjs';
import {coverCatalog} from '../i18n/cover-catalog.mjs';
import {tutorialSample} from '../client/tutorial-sample.mjs';
const placeholders=text=>[...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(m=>m[1]).sort();
test('combined catalog has matching ES/EN keys and placeholders',()=>{
 assert.deepEqual(Object.keys(presentationCatalog.es).sort(),Object.keys(presentationCatalog.en).sort());
 for(const key of Object.keys(presentationCatalog.es)){assert.equal(typeof presentationCatalog.en[key],'string');assert.deepEqual(placeholders(presentationCatalog.es[key]),placeholders(presentationCatalog.en[key]),key);}
});
test('English coverage gate does not activate an old English preference',()=>{
 const writes=[];const locale=createPresentationLocale({storage:{getItem:()=> 'en',setItem:(...args)=>writes.push(args)}});
 assert.equal(locale.getLocale(),'es');assert.equal(locale.isAvailable('en'),false);assert.equal(locale.setLocale('en'),false);assert.deepEqual(writes,[]);
 assert.equal(locale.setLocale('es'),true);assert.equal(writes.length,1);
});
test('locale preference uses only its own key and switching does not mutate supplied game state',()=>{
 const calls=[],state={revision:7,seed:424242,score:531,choiceId:'CALL_NANO'};const before=JSON.stringify(state);
 const locale=createPresentationLocale({key:'presentation-only',availableLocales:['es','en'],storage:{getItem:k=>{calls.push(['get',k]);return 'en-GB';},setItem:(k,v)=>calls.push(['set',k,v])}});
 assert.equal(locale.getLocale(),'en');assert.equal(locale.setLocale('es'),true);assert.equal(locale.setLocale('en-US'),true);assert.equal(JSON.stringify(state),before);
 assert.ok(calls.every(call=>call[1]==='presentation-only'));
});
test('storage denial and corrupt preferences do not block presentation',()=>{
 const locale=createPresentationLocale({availableLocales:['es','en'],storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}}});
 assert.equal(locale.getLocale(),'es');assert.equal(locale.setLocale('en'),true);assert.equal(locale.getLocale(),'en');
 assert.equal(createPresentationLocale({storage:{getItem:()=>'{broken}'}}).getLocale(),'es');
});
test('unknown locale is rejected and listener disposal stops updates',()=>{
 const locale=createPresentationLocale({availableLocales:['es','en']});let calls=0;const off=locale.subscribe(()=>calls++);
 assert.equal(locale.setLocale('fr'),false);locale.setLocale('en');assert.equal(calls,1);off();locale.setLocale('es');assert.equal(calls,1);
});
test('formatting is explicit and missing keys or parameters fail rather than leak untranslated keys',()=>{
 const locale=createPresentationLocale({availableLocales:['es','en'],initialLocale:'en'});
 assert.equal(locale.t('tutorial.progress',{step:2}),'DEMO · 2/3');assert.throws(()=>locale.t('tutorial.progress'),/Missing translation parameter/);assert.throws(()=>locale.t('not_a_key'),/Missing presentation translation/);
});
test('Spanish tutorial copy is derived from canonical sample and English preserves choice IDs',()=>{
 assert.equal(coverCatalog.es['tutorial.'+tutorialSample.eventId+'.body'],tutorialSample.body);
 for(const choice of tutorialSample.choices){const key='tutorial.'+tutorialSample.eventId+'.'+choice.id;assert.equal(coverCatalog.es[key+'.label'],choice.label);assert.ok(coverCatalog.en[key+'.label']);assert.ok(coverCatalog.en[key+'.result']);}
});
