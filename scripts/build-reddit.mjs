import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build,context} from 'esbuild';
import {localeFingerprint} from './locale-fingerprint.mjs';
import {writeReleaseManifest} from './reddit-release-manifest.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'reddit/public');
const releaseStatus=JSON.parse(fs.readFileSync(path.join(root,'reddit/i18n/release-status.json'),'utf8'));
const preview=process.argv.includes('--locale-preview');
const englishEnabled=preview||(['englishReady','legacyCoverage','completeRegression','visualAndLanguageReview'].every(key=>releaseStatus[key]===true)&&releaseStatus.implementationHash===localeFingerprint(root));
execFileSync(process.execPath,[path.join(root,'scripts/build-narrative-locales.mjs'),...(englishEnabled&&!preview?['--release']:[])],{cwd:root,stdio:'inherit'});
if(!process.argv.includes('--watch'))fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'images'),{recursive:true});
const assets=JSON.parse(fs.readFileSync(path.join(root,'web/assets.json'),'utf8'));
for(const [key,value] of Object.entries(assets)){
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if(!match)throw Error('Unsupported image '+key);
  const bytes=Buffer.from(match[2],'base64'),hash=createHash('sha256').update(bytes).digest('hex');
  const file=hash+'.'+(match[1]==='jpeg'?'jpg':match[1]);fs.writeFileSync(path.join(out,'images',file),bytes);assets[key]='./images/'+file;
}
for(const file of ['game.html','splash.html','splash.css'])fs.copyFileSync(path.join(root,'reddit/client',file),path.join(out,file));
fs.copyFileSync(path.join(root,'web/assets/brand/cover.png'),path.join(out,'cover.png'));
fs.copyFileSync(path.join(root,'web/assets/brand/cover-en.jpg'),path.join(out,'cover-en.jpg'));
assets.brand_cover_en='./cover-en.jpg';
fs.writeFileSync(path.join(out,'assets.json'),JSON.stringify(assets));
fs.writeFileSync(path.join(out,'page.css'),fs.readFileSync(path.join(root,'reddit/client/daily.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'reddit/client/cover.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'reddit/client/locale.css'),'utf8')+'\n.notice{max-width:520px;margin:8vh auto;padding:24px;color:white;font-family:system-ui}.notice[hidden]{display:none}');
fs.cpSync(path.join(root,'web/assets/fonts'),path.join(out,'fonts'),{recursive:true});
fs.appendFileSync(path.join(out,'page.css'),'\n'+fs.readFileSync(path.join(root,'web/sport-theme.css'),'utf8'));
const configs=[
 // Page chrome is Reddit-specific; original Android stylesheet stays untouched.
 {entryPoints:[path.join(root,'reddit/client/game.mjs'),path.join(root,'reddit/client/splash.mjs')],outdir:out,bundle:true,format:'esm',platform:'browser',target:'es2022',splitting:true,minify:true,loader:{'.css':'text'},metafile:true,define:{__ELEVENFATE_ENGLISH_ENABLED__:String(englishEnabled)}},
 {entryPoints:[path.join(root,'reddit/server/index.mjs')],outfile:path.join(root,'reddit/build/server/index.cjs'),bundle:true,format:'cjs',platform:'node',target:'node24',minify:true,metafile:true},
];
for(let i=0;i<configs.length;i++){
 if(process.argv.includes('--watch')){const ctx=await context(configs[i]);await ctx.watch();}
 else{const result=await build(configs[i]);fs.mkdirSync(path.join(root,'reddit/build'),{recursive:true});fs.writeFileSync(path.join(root,`reddit/build/metafile-${i}.json`),JSON.stringify(result.metafile));}
}
if(!process.argv.includes('--watch')){
 const release=writeReleaseManifest(root,{preview,englishEnabled});
 console.log('Release build: '+release.buildId+'; locale preview: '+preview+'; English: '+englishEnabled);
}
console.log('ElevenFate Reddit: reused engine/UI; extracted images; no videos or native Android code.');
