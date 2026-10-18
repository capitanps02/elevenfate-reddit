import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
test('the language selector preserves the original launch composition and stylesheet',()=>{
 const original=source('./fixtures/splash-original.html');
 const current=source('../client/splash.html');
 const launch=html=>html.match(/<div class="launch">([\s\S]*?)<\/div>/)[1].replace(/ data-i18n/g,'').replace(/>\s+</g,'><').trim();
 assert.equal(launch(current),launch(original));
 const css=source('../client/splash.css'),baseline=source('./fixtures/splash-original.css');
 assert.ok(css.startsWith(baseline));
 const additions=css.slice(baseline.length);
 assert.ok(additions.includes('position:absolute'));
 assert.ok(additions.includes('background:#09090b'));
 assert.ok(additions.includes('width:44px'));
 assert.doesNotMatch(additions,/\.launch|main>img|h1\{/);
});
test('the compact selector retains an accessible full language name and synchronous Reddit expansion',()=>{
 const js=source('../client/splash.mjs');
 assert.ok(js.includes("short.setAttribute('aria-hidden','true')"));
 assert.ok(js.includes("control.element.replaceChildren(full,short)"));
 assert.ok(js.includes("addEventListener('click',event=>requestExpandedMode(event,'game'))"));
 assert.doesNotMatch(js,/await requestExpandedMode/);
});
