import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocale,exactInterfaceTranslation} from '../i18n/runtime.mjs';
import fs from 'node:fs';
import ts from 'typescript';
import {FOOTBALL_DIVISIONS} from '../../dist/catalog/football/index.js';
import {REPORT_URL,reportUrlForLanguage} from '../shared/help-content.mjs';
import vm from 'node:vm';
import narrative from '../i18n/narrative.generated.json' with {type:'json'};
import {EVENT_CUTSCENES,PROLOGUE_CUTSCENE} from '../../dist/content/event-cutscenes.js';
import {PLAYER_ACTION_CATALOG} from '../../dist/player-actions/index.js';
import {NPC_CATALOG} from '../../dist/catalog/npcs.js';
import {MICROFEEDS_26_30} from '../../dist/content/microfeeds/26_30.js';
import {MICROFEEDS_30_34} from '../../dist/content/microfeeds/30_34.js';
import {MICROFEEDS_34_PLUS} from '../../dist/content/microfeeds/34_plus.js';
const check=sources=>{const locale=createLocale({initial:'en'});for(const source of sources)assert.notEqual(locale.text(source),source,source);assert.deepEqual(locale.missing(),[]);};
test('every executable player action, option and result has an English presentation',()=>{
 const before=structuredClone(PLAYER_ACTION_CATALOG);
 check(PLAYER_ACTION_CATALOG.flatMap(action=>[action.label,action.description,...action.options.flatMap(option=>[option.label,option.publicResult])]));
 assert.deepEqual(PLAYER_ACTION_CATALOG,before);
});
test('all public NPC roles translate without altering names or exposing private agendas',()=>{
 const before=structuredClone(NPC_CATALOG);check(NPC_CATALOG.map(npc=>npc.role));assert.deepEqual(NPC_CATALOG,before);
});
test('every active microfeed translates without changing its source, gates or weight',()=>{
 const feeds=[...MICROFEEDS_26_30,...MICROFEEDS_30_34,...MICROFEEDS_34_PLUS],before=structuredClone(feeds);
 check(feeds.map(feed=>feed.text));assert.deepEqual(feeds,before);
});
test('all consequence labels and league names have explicit English translations',()=>{
 const source=ts.createSourceFile('consequences.ts',fs.readFileSync(new URL('../../src/narrative/consequences.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true),labels=new Set();
 function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(source)==='label'&&ts.isStringLiteral(node.initializer))labels.add(node.initializer.text);ts.forEachChild(node,visit);}visit(source);
 for(const label of [...labels,...FOOTBALL_DIVISIONS.map(division=>division.name)])assert.equal(typeof exactInterfaceTranslation(label),'string',label);
 const locale=createLocale({initial:'en'});assert.equal(locale.text('Clasificación de Liga Superior Española'),'Spanish Top Division standings');
});
test('English reporting changes only the subject, not the destination or the Spanish default',()=>{
 assert.equal(reportUrlForLanguage(),REPORT_URL);assert.equal(reportUrlForLanguage('es'),REPORT_URL);
 const original=new URL(REPORT_URL),translated=new URL(reportUrlForLanguage('en'));
 assert.equal(translated.origin,original.origin);assert.equal(translated.pathname,original.pathname);assert.equal(translated.searchParams.get('to'),original.searchParams.get('to'));assert.equal(translated.searchParams.get('subject'),'ElevenFate - issue');
});
test('every story-scene title has an English display without changing clip identities or files',()=>{
 const clips=[PROLOGUE_CUTSCENE,...EVENT_CUTSCENES],before=structuredClone(clips),locale=createLocale({initial:'en'});locale.addCatalog(narrative);
 for(const clip of clips)assert.notEqual(locale.text(clip.title),clip.title,clip.title);
 assert.deepEqual(clips,before);assert.deepEqual(locale.missing(),[]);
});
test('the shared UI retains its original import graph and remains embeddable in PlayCanvas and Android',()=>{
 const ui=fs.readFileSync(new URL('../../web/game-ui.js',import.meta.url),'utf8');
 const imports=[...ui.matchAll(/^import .* from '([^']+)';$/gm)].map(match=>match[1]);
 assert.deepEqual(imports,['./cutscene-player.js','./club-names.js','./indexed-save-store.js']);
 const embedded=ui.replace(/^import .*;\n/gm,'').replace('export function mountGame','function mountGame');
 assert.doesNotThrow(()=>new vm.Script('(function(){'+embedded+'})'));
});
