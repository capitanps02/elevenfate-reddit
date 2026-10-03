import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const packaged=path.join(root,'android/app/src/main/assets');
const imports=text=>[...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);

test('new/current saves skip historical evidence; real old catalogs load and migrate',()=>{
 const code=`import assert from 'node:assert/strict';import fs from 'node:fs';
 import {GameSession} from './dist/session/game-session.js';
 import {LEGACY_CONTENT_SOURCES} from './dist/session/content-migration-core.js';
 const session=await GameSession.create(112233,{sessionId:'lazy-registry'});
 const snapshot=session.exportSnapshot();await GameSession.migrateAndResume(snapshot);
 assert.equal(Object.keys(LEGACY_CONTENT_SOURCES).length,0);
 const events=JSON.parse(fs.readFileSync('qa/fixtures/t5.1/pre-t51-event-catalog.json','utf8'));
 const old=await GameSession.create(112233,{sessionId:'historical',events});
 assert.equal(Object.keys(LEGACY_CONTENT_SOURCES).length,0);
 const migrated=await GameSession.migrateAndResume(old.exportSnapshot());
 assert.ok(Object.keys(LEGACY_CONTENT_SOURCES).length>20);
 assert.deepEqual(migrated.exportSnapshot().state.rngState,old.exportSnapshot().state.rngState);
 assert.equal(migrated.exportSnapshot().contentIdentity,snapshot.contentIdentity);`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8',timeout:60000});
 assert.equal(run.status,0,run.stderr+run.stdout);
});
test('current header with historical decision provenance also loads evidence',()=>{
 const run=spawnSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';import {GameSession} from './dist/session/game-session.js';import {LEGACY_CONTENT_SOURCES,contentSourcesForSnapshot} from './dist/session/content-migration-core.js';const s=(await GameSession.create(1)).exportSnapshot();s.decisionProvenance=[{sourceContentIdentity:'2e07efd2ea99c4e9ec4c2b20ae89664204f76db2c55a72d567208799c01bccff'}];await contentSourcesForSnapshot(s,s.contentIdentity);assert.ok(Object.keys(LEGACY_CONTENT_SOURCES).length>20);`],{cwd:root,encoding:'utf8',timeout:60000});
 assert.equal(run.status,0,run.stderr);
});
test('packaged module references resolve; static startup excludes historical registry',()=>{
 const files=JSON.parse(fs.readFileSync(path.join(packaged,'offline-manifest.json'))).files.filter(f=>f.path.endsWith('.js'));
 for(const file of files){const filename=path.join(packaged,file.path);for(const spec of imports(fs.readFileSync(filename,'utf8'))){if(spec.startsWith('.'))assert.ok(fs.existsSync(path.resolve(path.dirname(filename),spec)),`${file.path} -> ${spec}`);}}
 const visited=new Set();
 function visit(file){if(visited.has(file))return;visited.add(file);const text=fs.readFileSync(file,'utf8').replace(/\bimport\s*\([^)]*\)/g,'');for(const spec of imports(text))if(spec.startsWith('.'))visit(path.resolve(path.dirname(file),spec));}
 visit(path.join(packaged,'web/local.js'));
 assert.ok(![...visited].some(f=>/\/(?:post-t51|pre-t51|pre-t41)-legacy-registry\.js$/.test(f)));
 assert.ok(![...visited].some(f=>f.endsWith('/content-migration.js')));
});
test('external images preserve original bytes and remain offline',()=>{
 const source=JSON.parse(fs.readFileSync(path.join(root,'web/assets.json')));
 const local=fs.readFileSync(path.join(packaged,'web/local.js'),'utf8');
 const urls=JSON.parse(/const assets=(.*);\n/.exec(local)[1]);
 for(const [key,uri] of Object.entries(source)){const expected=Buffer.from(uri.split(',')[1],'base64');const actual=fs.readFileSync(path.resolve(packaged,'web',urls[key]));assert.deepEqual(actual,expected,key);}
 assert.ok(Buffer.byteLength(local)<300000);
});
