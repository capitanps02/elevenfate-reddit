import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {localeFingerprint} from './locale-fingerprint.mjs';

export const releaseHash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function releaseFiles(directory){
  return fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>entry.isDirectory()?releaseFiles(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
}
export function writeReleaseManifest(root,{preview,englishEnabled}){
  const out=path.join(root,'reddit/public'),sourceFingerprint=localeFingerprint(root);
  const fonts=Object.fromEntries(releaseFiles(path.join(out,'fonts')).map(file=>[path.basename(file),releaseHash(file)]));
  const identity={sourceFingerprint,fonts,localePreview:preview,englishEnabled};
  const buildId='EF-C3-'+createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0,16);
  for(const name of ['game.html','splash.html']){
    const file=path.join(out,name);
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/<meta name="ef-build"[^>]*>/g,'').replace('</head>',`<meta name="ef-build" content="${buildId}"></head>`));
  }
  const files=Object.fromEntries([...releaseFiles(out).filter(file=>path.basename(file)!=='release.json'),path.join(root,'reddit/build/server/index.cjs')].map(file=>[path.relative(root,file),releaseHash(file)]));
  const manifest={schemaVersion:1,buildId,sourceFingerprint,localePreview:preview,englishEnabled,files};
  fs.writeFileSync(path.join(out,'release.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
export function verifyReleaseFiles(root,manifest){
  if(manifest.localePreview!==false)throw Error('A locale-preview build cannot be published.');
  if(manifest.englishEnabled!==true)throw Error('The certified bilingual interface is not enabled.');
  for(const rel of ['reddit/public/game.html','reddit/public/splash.html','reddit/public/game.js','reddit/public/page.css','reddit/build/server/index.cjs']){
    if(!manifest.files[rel])throw Error('Missing release entry: '+rel);
  }
  for(const [rel,expected] of Object.entries(manifest.files)){
    const file=path.resolve(root,rel),relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Invalid release path: '+rel);
    if(!fs.existsSync(file)||releaseHash(file)!==expected)throw Error('Release file changed or missing: '+rel);
  }
  const allowed=new Set(Object.keys(manifest.files));
  for(const file of releaseFiles(path.join(root,'reddit/public'))){
    const rel=path.relative(root,file);
    if(path.basename(file)==='release.json')continue;
    if(!allowed.has(rel))throw Error('Unsealed production file: '+rel);
    if(/(^|\/)(visual(?:-before)?(?:\.|\/)|fixtures\/)/.test(rel))throw Error('QA catalogue found in production: '+rel);
  }
  for(const name of ['game.html','splash.html']){
    if(!fs.readFileSync(path.join(root,'reddit/public',name),'utf8').includes(`name="ef-build" content="${manifest.buildId}"`))throw Error('Wrong build identifier in '+name);
  }
  return {buildId:manifest.buildId,filesChecked:allowed.size};
}
