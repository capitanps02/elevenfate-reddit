import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {releaseHash,verifyReleaseFiles} from '../../scripts/reddit-release-manifest.mjs';

function fixture(action){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'elevenfate-release-'));
  const manifest={buildId:'EF-test',localePreview:false,englishEnabled:true,files:{}};
  const put=(rel,body)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);manifest.files[rel]=releaseHash(file);};
  for(const rel of ['reddit/public/game.html','reddit/public/splash.html'])put(rel,'<meta name="ef-build" content="EF-test">');
  for(const rel of ['reddit/public/game.js','reddit/public/page.css','reddit/build/server/index.cjs'])put(rel,'approved');
  try{action({root,manifest,put});}finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('production release accepts sealed normal entrypoints',()=>fixture(({root,manifest})=>assert.equal(verifyReleaseFiles(root,manifest).filesChecked,5)));
test('production release rejects language previews',()=>fixture(({root,manifest})=>{manifest.localePreview=true;assert.throws(()=>verifyReleaseFiles(root,manifest),/preview/);}));
test('production release rejects a silently disabled certified language',()=>fixture(({root,manifest})=>{manifest.englishEnabled=false;assert.throws(()=>verifyReleaseFiles(root,manifest),/bilingual/);}));
test('production release rejects an edited compiled entry',()=>fixture(({root,manifest})=>{fs.appendFileSync(path.join(root,'reddit/public/game.js'),'changed');assert.throws(()=>verifyReleaseFiles(root,manifest),/changed/);}));
test('production release rejects a missing server bundle',()=>fixture(({root,manifest})=>{fs.unlinkSync(path.join(root,'reddit/build/server/index.cjs'));assert.throws(()=>verifyReleaseFiles(root,manifest),/missing/);}));
test('production release rejects extra QA files',()=>fixture(({root,manifest})=>{fs.writeFileSync(path.join(root,'reddit/public/visual.js'),'test fixture');assert.throws(()=>verifyReleaseFiles(root,manifest),/Unsealed/);}));
test('production release rejects QA files even when added to the seal',()=>fixture(({root,manifest,put})=>{put('reddit/public/visual-before.js','test fixture');assert.throws(()=>verifyReleaseFiles(root,manifest),/QA catalogue/);}));
test('production release rejects mixed identifiers after resealing an HTML file',()=>fixture(({root,manifest,put})=>{put('reddit/public/game.html','<meta name="ef-build" content="wrong">');assert.throws(()=>verifyReleaseFiles(root,manifest),/identifier/);}));
test('production release rejects paths outside the candidate',()=>fixture(({root,manifest})=>{manifest.files['../foreign']='invalid';assert.throws(()=>verifyReleaseFiles(root,manifest),/Invalid release path/);}));
