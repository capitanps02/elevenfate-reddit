import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build,context} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'reddit/public');
if(!process.argv.includes('--watch'))fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'images'),{recursive:true});
const assets=JSON.parse(fs.readFileSync(path.join(root,'web/assets.json'),'utf8'));
for(const [key,value] of Object.entries(assets)){
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if(!match)throw Error('Unsupported image '+key);
  const bytes=Buffer.from(match[2],'base64'),hash=createHash('sha256').update(bytes).digest('hex');
  const file=hash+'.'+(match[1]==='jpeg'?'jpg':match[1]);fs.writeFileSync(path.join(out,'images',file),bytes);assets[key]='./images/'+file;
}
fs.writeFileSync(path.join(out,'assets.json'),JSON.stringify(assets));
for(const file of ['game.html','splash.html','splash.css'])fs.copyFileSync(path.join(root,'reddit/client',file),path.join(out,file));
fs.copyFileSync(path.join(root,'web/assets/brand/cover.png'),path.join(out,'cover.png'));
fs.writeFileSync(path.join(out,'page.css'),fs.readFileSync(path.join(root,'web/page.css'),'utf8')+'\n.notice{max-width:520px;margin:10vh auto;padding:24px;color:white;font-family:system-ui}.notice[hidden]{display:none}');
const configs=[
 {entryPoints:[path.join(root,'reddit/client/game.mjs'),path.join(root,'reddit/client/splash.mjs')],outdir:out,bundle:true,format:'esm',platform:'browser',target:'es2022',splitting:true,minify:true,loader:{'.css':'text'},metafile:true},
 {entryPoints:[path.join(root,'reddit/server/index.mjs')],outfile:path.join(root,'reddit/build/server/index.cjs'),bundle:true,format:'cjs',platform:'node',target:'node22',minify:true,metafile:true},
];
for(let i=0;i<configs.length;i++){
 if(process.argv.includes('--watch')){const ctx=await context(configs[i]);await ctx.watch();}
 else{const result=await build(configs[i]);fs.mkdirSync(path.join(root,'reddit/build'),{recursive:true});fs.writeFileSync(path.join(root,`reddit/build/metafile-${i}.json`),JSON.stringify(result.metafile));}
}
console.log('ElevenFate Reddit: reused engine/UI; extracted images; no videos or native Android code.');
