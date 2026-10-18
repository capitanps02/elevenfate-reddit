import fs from 'node:fs';
import path from 'node:path';
import {localeFingerprint} from './locale-fingerprint.mjs';
import {verifyReleaseFiles} from './reddit-release-manifest.mjs';
const root=process.cwd(),candidate=process.argv.includes('--candidate');
try{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'reddit/public/release.json'),'utf8'));
  const status=JSON.parse(fs.readFileSync(path.join(root,'reddit/i18n/release-status.json'),'utf8'));
  const fingerprint=localeFingerprint(root);
  if(manifest.sourceFingerprint!==fingerprint||status.implementationHash!==fingerprint)throw Error('Source or locale certificate differs from this build.');
  const required=['englishReady','legacyCoverage','completeRegression','visualAndLanguageReview',...(!candidate?['redditPlaytest']:[])];
  if(required.some(key=>status[key]!==true))throw Error('Incomplete release evidence: '+required.filter(key=>status[key]!==true).join(', '));
  const result=verifyReleaseFiles(root,manifest);
  for(const number of [0,1]){
    const meta=JSON.parse(fs.readFileSync(path.join(root,`reddit/build/metafile-${number}.json`),'utf8'));
    const forbidden=Object.keys(meta.inputs).filter(file=>/^(visual\/|reddit\/test\/)/.test(file));
    if(forbidden.length)throw Error('QA module bundled into production: '+forbidden.join(', '));
  }
  console.log(JSON.stringify({ok:true,...result,candidate,localePreview:false,englishEnabled:true}));
}catch(error){console.error('RELEASE BLOCKED: '+error.message);process.exitCode=1;}
