import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCover} from '../client/cover.mjs';
import {createLocale} from '../i18n/runtime.mjs';
import narrative from '../i18n/narrative.generated.json' with {type:'json'};
import {preservePresentation} from '../i18n/presentation.mjs';
import {makeRoot} from './cover-dom.mjs';
const releaseLocale=options=>{const locale=createLocale(options);locale.addCatalog(narrative);return locale;};
const action=(root,id)=>root.querySelector('[data-cover-action="'+id+'"]');
const text=n=>n.textContent+n.children.map(text).join('');
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
test('English preview changes all cover/tutorial text while callbacks stay inactive',async()=>{
 const root=makeRoot(),locale=releaseLocale({});let opened=0,reads=0;
 const dispose=mountCover({root,locale,readCareer:async()=>{reads++;return null;},onContinue:()=>opened++,onNew:()=>opened++,onDaily:()=>opened++});await settle();
 action(root,'en').click();assert.equal(root.lang,'en');assert.ok(text(root).includes('New game'));assert.equal(action(root,'en').attributes['aria-pressed'],'true');
 action(root,'tutorial').click();action(root,'simulate').click();assert.ok(text(root).includes('The squad of 26'));assert.ok(text(root).includes('Nano has not had the call.'));assert.equal(action(root,'b').dataset.choiceId,'CALL_RIVAS');
 action(root,'b').click();assert.ok(text(root).includes('Rivas gives you useful context'));assert.ok(text(root).includes('context can change the outcome'));
 action(root,'acknowledge').click();assert.ok(text(root).includes('training, health'));assert.equal(reads,1);assert.equal(opened,0);dispose();
});
test('switching language mid-tutorial preserves the selected choice and does not repeat reads',async()=>{
 const root=makeRoot(),locale=releaseLocale({});let reads=0;
 const dispose=mountCover({root,locale,readCareer:async()=>{reads++;return 'saved';},onContinue(){},onNew(){},onDaily(){}});await settle();
 action(root,'tutorial').click();action(root,'simulate').click();action(root,'a').click();locale.set('en');assert.ok(text(root).includes('Nano appreciates hearing it directly'));locale.set('es');assert.ok(text(root).includes('Nano agradece que se lo cuentes directamente.'));assert.equal(reads,1);dispose();
 locale.set('en');assert.equal(root.children.length,0);
});
test('English errors use localized recovery text in the preview',async()=>{
 const root=makeRoot(),locale=releaseLocale({initial:'en'});
 const dispose=mountCover({root,locale,readCareer:async()=>{throw Error('Texto de error del servidor en español');},onContinue(){},onNew(){},onDaily(){}});await settle();
 assert.ok(text(root).includes('Could not check your saved career'));assert.ok(!text(root).includes('Texto de error'));assert.equal(action(root,'continue').disabled,true);dispose();
});
test('language updates preserve expanded tutorial help and its focused summary without another read',async()=>{
 const root=makeRoot(),locale=releaseLocale({});let reads=0;
 const dispose=mountCover({root,locale,readCareer:async()=>{reads++;return null;},onContinue(){},onNew(){},onDaily(){}});await settle();
 action(root,'tutorial').click();action(root,'simulate').click();action(root,'a').click();action(root,'acknowledge').click();
 let details=root.querySelector('details');details.open=true;details.listeners.toggle();action(root,'features').focus();
 locale.set('en');details=root.querySelector('details');assert.equal(details.open,true);assert.equal(root.ownerDocument.activeElement,action(root,'features'));assert.equal(reads,1);
 locale.set('es');assert.equal(root.querySelector('details').open,true);assert.equal(reads,1);dispose();
});
test('retry availability updates keep keyboard focus inside the cover when the retry button disappears',async()=>{
 const root=makeRoot(),locale=releaseLocale({});let reads=0,complete;
 const dispose=mountCover({root,locale,readCareer:async()=>{if(++reads===1)throw Error('Offline');return await new Promise(resolve=>{complete=resolve;});},onContinue(){},onNew(){},onDaily(){}});await settle();
 action(root,'retry').focus();action(root,'retry').click();assert.equal(root.ownerDocument.activeElement,root.querySelector('h1'));
 complete('saved');await settle();assert.equal(root.contains(root.ownerDocument.activeElement),true);assert.equal(action(root,'continue').disabled,false);dispose();
});
