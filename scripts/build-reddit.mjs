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
fs.appendFileSync(path.join(out,'page.css'),'\n.daily-entry{position:fixed;right:12px;top:8px;z-index:50;background:#d7ba74;color:#171717;border:0;border-radius:12px;padding:9px 14px;font-weight:700}.daily-entry[hidden],.daily-panel[hidden],#game[hidden]{display:none}.daily-panel{box-sizing:border-box;max-width:640px;margin:0 auto;min-height:100dvh;padding:24px 18px 48px;background:#111116;color:#eee;font-family:system-ui;line-height:1.5}.daily-panel h1{color:#d7ba74;font-size:24px}.daily-panel button{display:block;width:100%;padding:14px;margin:12px 0;border-radius:12px;border:1px solid #806e48;background:#25252c;color:#fff;font:inherit;text-align:left}.daily-panel button:disabled{opacity:.5}.daily-panel p{white-space:pre-line}');
const configs=[
 {entryPoints:[path.join(root,'reddit/client/game.mjs'),path.join(root,'reddit/client/splash.mjs')],outdir:out,bundle:true,format:'esm',platform:'browser',target:'es2022',splitting:true,minify:true,loader:{'.css':'text'},metafile:true},
 {entryPoints:[path.join(root,'reddit/server/index.mjs')],outfile:path.join(root,'reddit/build/server/index.cjs'),bundle:true,format:'cjs',platform:'node',target:'node22',minify:true,metafile:true},
];
for(let i=0;i<configs.length;i++){
 if(process.argv.includes('--watch')){const ctx=await context(configs[i]);await ctx.watch();}
 else{const result=await build(configs[i]);fs.mkdirSync(path.join(root,'reddit/build'),{recursive:true});fs.writeFileSync(path.join(root,`reddit/build/metafile-${i}.json`),JSON.stringify(result.metafile));}
}
console.log('ElevenFate Reddit: reused engine/UI; extracted images; no videos or native Android code.');
