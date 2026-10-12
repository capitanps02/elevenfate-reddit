import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBootPresentation} from '../client/boot-presentation.mjs';
import {createPresentationLocale} from '../client/presentation-locale.mjs';
import {makeGameRoot,text,findButton} from './game-entry-dom.mjs';
function setup(i18n){
 const root=makeGameRoot(),document=root.ownerDocument,login=document.createElement('section'),error=document.createElement('section'),retry=document.createElement('button');
 login.append(document.createElement('h1'),document.createElement('p'));error.append(document.createElement('h1'),document.createElement('p'),retry);login.hidden=true;error.hidden=true;root.append(login,error);
 document.documentElement={};document.querySelector=id=>({'#login-required':login,'#load-error':error,'#retry':retry})[id];let retries=0;
 const controller=mountBootPresentation({document,i18n,onRetry:()=>retries++});return {root,document,login,error,retry,controller,retries:()=>retries};
}
test('startup and login copy localize before authentication and retry stays a read-side action',()=>{
 const writes=[],i18n=createPresentationLocale({availableLocales:['es','en'],initialLocale:'en',storage:{getItem:()=>null,setItem:(...args)=>writes.push(args)}}),x=setup(i18n);
 assert.match(text(x.login),/Sign in to Reddit/);assert.equal(x.error.hidden,true);assert.deepEqual(writes,[]);x.controller.showError();assert.equal(x.error.lang,'en');assert.equal(x.document.documentElement.lang,'en');assert.equal(x.error.attributes.role,'alert');assert.equal(x.document.activeElement,x.error.querySelector('h1'));assert.match(text(x.error),/Check your connection or storage/);
 findButton(x.error,'Try again').click();assert.equal(x.retries(),1);assert.deepEqual(writes,[]);i18n.setLocale('es');assert.match(text(x.error),/No se pudo abrir ElevenFate/);assert.equal(x.error.hidden,false);x.controller.dispose();
});
test('blocked or corrupt preference cannot block boot or activate an unavailable language',()=>{
 const i18n=createPresentationLocale({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}}),x=setup(i18n);assert.equal(i18n.getLocale(),'es');assert.equal(i18n.setLocale('en'),false);x.controller.showError();assert.match(text(x.error),/Comprueba la conexión o el almacenamiento/);assert.ok(findButton(x.error,'Reintentar'));x.controller.dispose();
});
test('disposed startup stops locale updates, errors and retry callbacks',()=>{
 const i18n=createPresentationLocale({availableLocales:['es','en']}),x=setup(i18n),before=text(x.root);x.controller.dispose();i18n.setLocale('en');x.controller.showError();x.retry.click();assert.equal(text(x.root),before);assert.equal(x.error.hidden,true);assert.equal(x.retries(),0);
});
