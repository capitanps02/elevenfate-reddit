import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {localeFingerprint} from './locale-fingerprint.mjs';
execFileSync(process.execPath,['scripts/build-narrative-locales.mjs','--release'],{stdio:'inherit'});
const status=JSON.parse(fs.readFileSync('reddit/i18n/release-status.json','utf8'));
const required=['englishReady','legacyCoverage','completeRegression','visualAndLanguageReview',...(!process.argv.includes('--candidate')?['redditPlaytest']:[])];
if(required.some(key=>status[key]!==true)||status.implementationHash!==localeFingerprint(process.cwd())){
 console.error('English release blocked: content, regression, visual review or Reddit validation remains incomplete.');
 process.exitCode=1;
}
