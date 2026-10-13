import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCatalog,createLocale,mergeCatalogs} from '../i18n/runtime.mjs';
import {GameSession} from '../../dist/session/game-session.js';
import narrative from '../i18n/narrative.generated.json' with {type:'json'};

test('Spanish is the default regardless of browser language; only an explicit valid preference selects English',()=>{
 assert.equal(createLocale().language,'es');
 assert.equal(createLocale({storage:{getItem:()=> 'en'}}).language,'en');
 assert.equal(createLocale({storage:{getItem:()=> 'fr'}}).language,'es');
 assert.equal(createLocale({storage:{getItem:()=>{throw Error('blocked');}}}).language,'es');
});
test('an uncertified production build stays in Spanish even with an old English preference',()=>{
 const locale=createLocale({enabled:false,storage:{getItem:()=> 'en'},initial:'en'});
 assert.equal(locale.language,'es');assert.equal(locale.set('en'),false);assert.equal(locale.text('Tu partida'),'Tu partida');
});
test('language updates synchronously and survives unavailable preference storage',()=>{
 const writes=[],seen=[];
 const locale=createLocale({storage:{getItem:()=>null,setItem:(...args)=>writes.push(args)}});
 const off=locale.subscribe(value=>seen.push(value));
 assert.equal(locale.set('en'),true);assert.equal(locale.text('Tu partida'),'Your save');
 assert.equal(locale.set('de'),false);assert.equal(locale.language,'en');
 locale.set('en');assert.deepEqual(seen,['en']);assert.deepEqual(writes,[['elevenfate.language.v1','en']]);
 off();locale.set('es');assert.deepEqual(seen,['en']);
 const blocked=createLocale({storage:{setItem:()=>{throw Error('quota');}}});assert.doesNotThrow(()=>blocked.set('en'));
});
test('explicit templates retain names, dates, numbers and punctuation while translating known nested labels',()=>{
 const locale=createLocale({initial:'en'});
 assert.equal(locale.text('Quedarme en El Club de la Vida'),'Stay at El Club de la Vida');
 assert.equal(locale.text('1 decisión'),'1 choice');assert.equal(locale.text('30 decisiones'),'30 choices');
 assert.equal(locale.text('Técnica 50 · Forma 41 · Físico 72 · Fatiga 8 · Riesgo 2'),'Technique 50 · Form 41 · Fitness 72 · Fatigue 8 · Risk 2');
 assert.equal(locale.text('Guardado automático · 30 decisiones'),'Autosave · 30 choices');
 assert.equal(locale.text('PRIVATE_CHOICE_ID'),'PRIVATE_CHOICE_ID');
 assert.equal(locale.text('50 / 100'),'50 / 100');assert.equal(locale.text('€1,200'),'€1,200');
 assert.equal(locale.text('Un texto todavía sin traducción.'),'Un texto todavía sin traducción.');
 assert.deepEqual(locale.missing(),['Un texto todavía sin traducción.']);
});
test('translation catalogs reject mismatched or ambiguous parameters and prioritise exact text',()=>{
 assert.throws(()=>compileCatalog({'Una oferta {0}':'An offer {1}'}),/parameters/);
 assert.throws(()=>compileCatalog({'Una oferta {0}{1}':'An offer {0}{1}'}),/Ambiguous/);
 assert.throws(()=>compileCatalog({'{0}':'{0}'}),/broad/);
 const locale=createLocale({initial:'en',catalog:compileCatalog({'Temporada {0}':'Season {0}','Temporada especial':'Special season'})});
 assert.equal(locale.text('Temporada especial'),'Special season');
 assert.throws(()=>compileCatalog({'Fuente':null}),/parameters/);
 assert.throws(()=>compileCatalog({'Fuente':''}),/parameters/);
 assert.throws(()=>compileCatalog({'Fuente {0}':{en:'Source {0}',nested:['1']}}),/parameters/);
 assert.throws(()=>mergeCatalogs({'Fuente':'Source'},{'Fuente':'Other'}),/Conflicting/);
 assert.equal(mergeCatalogs({'Fuente':'Source'},{'Fuente':'Source'}).Fuente,'Source');
 const repeated=createLocale({initial:'en',catalog:compileCatalog({'Repite {0} y {0}':'Repeat {0} and {0}'})});
 assert.equal(repeated.text('Repite 3 y 3'),'Repeat 3 and 3');assert.equal(repeated.text('Repite 3 y 4'),'Repite 3 y 4');
});
test('English presentation keeps UTC dates and EUR amounts',()=>{
 const locale=createLocale({initial:'en'});
 assert.equal(locale.date('2026-10-11T23:59:59Z'),'11 Oct 2026');
 assert.equal(locale.number(1200,{style:'currency',currency:'EUR',maximumFractionDigits:0}),'€1,200');
 locale.set('es');assert.equal(locale.date('2026-10-11T23:59:59Z'),'11 oct 2026');
});
test('sporting summaries and invalid-save messages stay readable in English without rewriting identifiers',()=>{
 const locale=createLocale({initial:'en'});
 assert.equal(locale.text('1 partido disputado'),'1 match played');assert.equal(locale.text('PAUSADA'),'PAUSED');
 assert.equal(locale.text('Suplente sin minutos · 0 min · Nota 6.3'),'Unused substitute · 0 min · Rating 6.3');
 assert.equal(locale.text('Sancionado · 0 min'),'Suspended · 0 min');
 assert.equal(locale.text('Guardado no válido en body.fitness: número ausente, no finito o fuera de rango.'),'Invalid save at body.fitness: missing, non-finite or out-of-range number.');
 assert.equal(locale.text('Guardado no válido en market.pending: contrato nuevo sin soporte.'),'Invalid save at market.pending: the saved data does not match the required format.');
 locale.set('es');assert.equal(locale.text('Guardado no válido en market.pending: contrato nuevo sin soporte.'),'Guardado no válido en market.pending: contrato nuevo sin soporte.');
});
test('the complete generated catalog can be mounted without conflicting interface translations',()=>{
 const locale=createLocale({initial:'en'});locale.addCatalog(narrative);
 for(const [source,translation] of Object.entries(narrative))assert.equal(locale.text(source),translation,source);
 const isolated=createLocale({initial:'en'});
 isolated.addCatalog({'Texto de prueba independiente':'Independent test text'});
 assert.equal(createLocale({initial:'en'}).text('Texto de prueba independiente'),'Texto de prueba independiente');
});
test('missing-text diagnostics stay bounded without changing fallback behaviour',()=>{
 const locale=createLocale({initial:'en'});
 for(let i=0;i<3000;i++)assert.equal(locale.text('Texto sin traducción '+i),'Texto sin traducción '+i);
 assert.equal(locale.missing().length,2048);locale.clearMissing();assert.equal(locale.missing().length,0);
});
test('100 language changes and public text projections never mutate the real career, RNG, revision or receipts',async()=>{
 const session=await GameSession.create(424242,{sessionId:'locale-purity'}),before=session.exportSnapshot(),view=session.getView();
 const locale=createLocale();
 for(let i=0;i<100;i++){locale.set(i%2?'es':'en');locale.text(view.decision?.title??'Tu siguiente capítulo');locale.text('Forma '+view.form);locale.date(view.date+'T00:00:00Z');}
 assert.deepEqual(session.exportSnapshot(),before);assert.deepEqual(session.getView(),view);
});
