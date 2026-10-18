import {requestExpandedMode} from '@devvit/web/client';
import {createBrowserLocale} from '../i18n/browser.mjs';
const locale=createBrowserLocale();
const copy=[...document.querySelectorAll('[data-i18n]')].map(node=>[node,node.textContent]);
function render(){
 for(const [node,source] of copy)node.textContent=locale.text(source);
 document.querySelector('main>img').src=locale.language==='en'?'cover-en.jpg':'cover.png';
 const full=document.createElement('span'),short=document.createElement('span');
 full.className='language-full';full.textContent=locale.language==='es'?'English':'Español';
 short.className='language-short';short.textContent=locale.language==='es'?'EN':'ES';short.setAttribute('aria-hidden','true');
 control.element.replaceChildren(full,short);
}
if(locale.enabled){const englishCover=new Image();englishCover.src='cover-en.jpg';englishCover.decode().catch(()=>{});}
const control=locale.control(document);document.querySelector('#language').append(control.element);
locale.subscribe(render);render();
document.querySelector('#play').addEventListener('click',event=>requestExpandedMode(event,'game'));
