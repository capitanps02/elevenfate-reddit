import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const generated=new Set(['release-status.json','inventory.json','coverage.json','missing-narrative.json','narrative-inventory.json','narrative.generated.json']);
export function localeFingerprint(root){
 const files=[];
 function visit(relative){
  for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
   const name=relative+'/'+entry.name;
   if(entry.isDirectory())visit(name);
   else if(/\.(ts|mjs|js|json|html|css|jpg|png)$/.test(name)&&!(relative==='reddit/i18n'&&generated.has(entry.name)))files.push(name);
  }
 }
 for(const directory of ['src','web','reddit/client','reddit/analytics','reddit/telemetry','reddit/server','reddit/shared','reddit/i18n','reddit/test','qa/fixtures/t5.1'])visit(directory);
 files.push('package.json','pnpm-lock.yaml','devvit.json','scripts/build.mjs','scripts/build-reddit.mjs','scripts/build-narrative-locales.mjs','scripts/legacy-narrative-sources.mjs','scripts/locale-fingerprint.mjs','scripts/check-locale-release.mjs');
 const hash=createHash('sha256');
 for(const name of files.sort()){hash.update(name+'\0');hash.update(fs.readFileSync(path.join(root,name)));hash.update('\0');}
 return hash.digest('hex');
}
