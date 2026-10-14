import test from 'node:test';
import assert from 'node:assert/strict';
import {createTextExport} from '../client/text-export.mjs';
import {createLocale} from '../i18n/runtime.mjs';
import {makeGameRoot,findButton,text} from './game-entry-dom.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(clipboard){const body=makeGameRoot(),doc=body.ownerDocument;doc.body=body;const create=doc.createElement;doc.createElement=tag=>{const n=create(tag);if(tag==='textarea')n.select=()=>{n.selected=n.value;};return n;};const locale=createLocale();return {body,doc,locale,exportText:createTextExport({document:doc,locale,clipboard})};}
test('manual export keeps exact bytes and filename across language changes, without changing the save',()=>{
 const x=setup(null),raw='{"name":"Álex D’Avila","rng":{"state":123},"space":" a b "}';x.exportText(raw,'elevenfate-partida.json');
 const dialog=x.body.querySelector('dialog[open]'),area=dialog.querySelector('textarea');assert.equal(area.value,raw);assert.equal(area.readOnly,true);
 x.locale.set('en');assert.equal(area.value,raw);assert.match(text(dialog),/Save this text as elevenfate-partida.json/);findButton(dialog,'Select all').click();assert.equal(area.selected,raw);assert.equal(x.doc.activeElement,area);dialog.close();assert.equal(x.body.children.length,0);x.locale.set('es');assert.equal(x.body.children.length,0);
});
test('a blocked clipboard selects the full exact copy and never reports successful copying',async()=>{
 const x=setup({writeText:async()=>{throw Error('Blocked by sandbox');}});x.exportText('{"private":"unchanged"}','copy.json');const dialog=x.body.querySelector('dialog[open]');findButton(dialog,'Copiar texto').click();await tick();assert.equal(dialog.querySelector('textarea').selected,'{"private":"unchanged"}');assert.match(text(dialog),/Copia el texto seleccionado y guárdalo como copy.json/);assert.doesNotMatch(text(dialog),/Texto copiado/);dialog.close();
});
test('copying is single-flight and a late clipboard response cannot repaint a closed export',async()=>{
 let resolve,calls=0;const x=setup({writeText:async raw=>{calls++;assert.equal(raw,'exact');await new Promise(r=>{resolve=r;});}});x.exportText('exact','copy.json');const dialog=x.body.querySelector('dialog[open]'),copy=findButton(dialog,'Copiar texto');copy.click();copy.click();assert.equal(calls,1);dialog.close();resolve();await tick();assert.equal(x.body.children.length,0);
});
test('closing export restores the actual originating control inside a ShadowRoot',()=>{
 const x=setup(null),button=x.doc.createElement('button');button.isConnected=true;const host={shadowRoot:{activeElement:button}};x.doc.activeElement=host;x.exportText('exact','copy.json');x.body.querySelector('dialog[open]').close();assert.equal(x.doc.activeElement,button);
});
test('an asynchronous export restores its explicit origin after disabling it has moved focus',()=>{
 const x=setup(null),button=x.doc.createElement('button');button.isConnected=true;x.doc.activeElement=x.body;
 x.exportText('exact','account.json',button);const dialog=x.body.querySelector('dialog[open]');button.disabled=false;dialog.close();assert.equal(x.doc.activeElement,button);
});
