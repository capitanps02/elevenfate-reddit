import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'reddit/public');
const sourceDirs=['src','web','reddit/client','reddit/i18n','reddit/shared','reddit/server','visual','scripts'];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const sources=Object.fromEntries(sourceDirs.flatMap(d=>walk(path.join(root,d))).map(p=>[path.relative(root,p),hash(p)]));
for(const f of ['package.json','pnpm-lock.yaml','tsconfig.json'])sources[f]=hash(path.join(root,f));
const release=JSON.parse(fs.readFileSync(path.join(out,'release.json'),'utf8'));
const buildId=release.buildId;
await build({entryPoints:[path.join(root,'visual/entry.mjs')],outfile:path.join(out,'visual.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,loader:{'.css':'text'},define:{__VISUAL_BUILD__:JSON.stringify(buildId),__ELEVENFATE_ENGLISH_ENABLED__:'true'}});
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="ef-build" content="'+buildId+'"><title>ElevenFate · C2</title><link rel="stylesheet" href="page.css"></head><body><div id="game"></div><script type="module" src="visual.js"></script></body></html>';
fs.writeFileSync(path.join(out,'visual.html'),html);
await build({entryPoints:[path.join(root,'visual/baseline-entry.mjs')],outfile:path.join(out,'visual-before.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,loader:{'.css':'text'},define:{__VISUAL_BUILD__:JSON.stringify(buildId),__ELEVENFATE_ENGLISH_ENABLED__:'true'}});
fs.writeFileSync(path.join(out,'visual-before.html'),html.replace('page.css','visual-before.css').replace('visual.js','visual-before.js'));
fs.writeFileSync(path.join(out,'visual-before.css'),['daily.css','cover.css','locale.css'].map(f=>fs.readFileSync(path.join(root,'reddit/client',f),'utf8')).join('\n'));
// Production HTML already carries this identity; do not rewrite a sealed release file.

const publicFiles=Object.fromEntries(walk(out).map(p=>[path.relative(root,p),hash(p)]));
fs.writeFileSync(path.join(root,'visual-build.json'),JSON.stringify({schemaVersion:1,buildId,sourceCommit:'bad9858',sources,publicFiles},null,2)+'\n');
console.log(buildId);
