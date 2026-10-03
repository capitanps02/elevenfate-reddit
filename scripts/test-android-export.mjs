import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const repo=path.resolve(import.meta.dirname,'..');const evidence=path.join(repo,'docs/android/hard-tests');fs.mkdirSync(evidence,{recursive:true});
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;if(!sdk)throw Error('Configura ANDROID_HOME al SDK local.');const adb=path.join(sdk,'platform-tools/adb'),serial=process.argv.find(a=>/^emulator-\d+$/.test(a)),pkg='com.elevenfate.game.debug';if(!serial)throw Error('Indica el serial de un emulador dedicado.');
const call=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024,env:process.env});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const sha=s=>createHash('sha256').update(s).digest('hex');
const report={date:new Date().toISOString(),variant:'debug',passed:false,clips:[],files:[]};let ws,evaluate;
const checkpoint=()=>fs.writeFileSync(path.join(evidence,process.argv.includes('--export-process-death')?'media-files-process-death.json':'media-files.json'),JSON.stringify(report,null,2)+'\n');
async function connect(){
 ws?.close();let pid;for(let i=0;i<60;i++){try{pid=call('shell','pidof',pkg).trim();}catch{}if(pid)break;await wait(500);}if(!pid)throw Error('Target app process did not start');call('forward','tcp:9224','localabstract:webview_devtools_remote_'+pid);
 let target;for(let i=0;i<50;i++){try{target=(await(await fetch('http://127.0.0.1:9224/json/list')).json()).find(t=>t.url.startsWith('https://appassets.androidplatform.net/'));}catch{}if(target)break;await wait(300);}
 if(!target)throw Error('WebView unavailable');ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let id=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);});
 ws.addEventListener('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('WebView disconnected'));}pending.clear();});
 evaluate=async expression=>{const result=await new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout: '+expression.slice(0,140)));},45000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,userGesture:true,returnByValue:true,awaitPromise:true}}));});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
}
const ROOT="document.querySelector('#game').shadowRoot";
async function snapshot(){return evaluate(`(async()=>{const {createIndexedSaveStore}=await import('./web/indexed-save-store.js');const s=createIndexedSaveStore({storage:localStorage,indexedDB,key:'historia-jugador.android.offline.session.v1',validate:()=>{}});try{return await s.readRaw();}finally{await s.close();}})()`);}
function nativeXml(){const file='/sdcard/elevenfate-hard-files.xml';call('shell','rm','-f',file);call('shell','uiautomator','dump',file);return call('shell','cat',file);}
function tapNode(xml,predicate){const node=[...xml.matchAll(/<node\b[^>]*>/g)].map(m=>m[0]).find(predicate);if(!node)throw Error('Native control unavailable');const b=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);if(!b)throw Error('Native bounds unavailable');call('shell','input','tap',String(Math.round((+b[1]+ +b[3])/2)),String(Math.round((+b[2]+ +b[4])/2)));}
try{
 if(!call('emu','avd','name').startsWith('Elevenfate_QA_'))throw Error('AVD no dedicado');
 report.apkSha256=sha(fs.readFileSync(path.join(repo,'android/app/build/outputs/apk/debug/app-debug.apk')));
 call('shell','cmd','connectivity','airplane-mode','enable');call('shell','am','start','-n',pkg+'/com.multihistoria.MainActivity');await wait(1000);await connect();
 await evaluate(`(async()=>{for(let i=0;i<60;i++){if(${ROOT}?.querySelector('.save-status'))return true;await new Promise(r=>setTimeout(r,300));}throw Error('Game not ready');})()`);
 const manifest=JSON.parse(fs.readFileSync(path.join(repo,'android/app/src/main/assets/offline-manifest.json')));
 for(const clip of process.argv.includes('--files-only')?[]:manifest.optimizations.activeClips){
  const result=await evaluate(`(async()=>{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.style.cssText='position:fixed;left:0;top:0;width:32px;height:32px;opacity:0.01';document.body.append(v);try{const loaded=new Promise((r,j)=>{const timer=setTimeout(()=>j(Error('Metadata timeout')),10000);v.onloadedmetadata=()=>{clearTimeout(timer);r();};v.onerror=()=>{clearTimeout(timer);j(Error('Media error '+v.error?.code));};});v.src='./web/assets/cutscenes/'+${JSON.stringify(clip)};await loaded;await v.play();for(let i=0;i<60;i++){if(v.currentTime>0&&v.readyState>=2)return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,playedSeconds:v.currentTime};await new Promise(r=>setTimeout(r,100));}throw Error('Video did not advance');}finally{v.pause();v.removeAttribute('src');v.load();v.remove();}})()`);
  report.clips.push({clip,passed:true,...result});checkpoint();console.log('Video',report.clips.length,clip);
 }
 await evaluate(`[...${ROOT}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Tu partida').click()`);await wait(500);
 const raw=await snapshot();if(!raw)throw Error('No save');JSON.parse(raw);
 const name='elevenfate-hard-'+Date.now()+'.json';
 await evaluate(`AndroidBridge.saveTextFile(${JSON.stringify(name)},${JSON.stringify(raw)})`);await wait(2000);
 let xml=nativeXml();fs.writeFileSync(path.join(evidence,'export-picker.xml'),xml);
 if(!xml.includes('documentsui'))throw Error('Android export picker not open');
 tapNode(xml,n=>/text="save"/i.test(n)&&/clickable="true"/.test(n));await wait(1500);
 const exported=call('exec-out','cat','/sdcard/Download/'+name);if(exported!==raw)throw Error('Exported file differs from save');
 report.files.push({scenario:'native-export-round-trip',passed:true,bytes:Buffer.byteLength(exported),sha256:sha(exported)});checkpoint();
 await evaluate(`${ROOT}.querySelector('input[type=file]').click()`);await wait(1500);
 xml=nativeXml();fs.writeFileSync(path.join(evidence,'import-picker.xml'),xml);
 if(!xml.includes('documentsui'))throw Error('Android import picker not open');
 tapNode(xml,n=>n.includes('text="'+name+'"'));await wait(1000);
 await evaluate(`(async()=>{for(let i=0;i<100;i++){const d=${ROOT}.querySelector('dialog');if(d?.textContent.includes('Recuperar esta copia')){[...d.querySelectorAll('button')].find(b=>b.textContent==='Confirmar').click();return true;}if(${ROOT}.textContent.includes('No se pudo importar'))throw Error('Import rejected');await new Promise(r=>setTimeout(r,200));}throw Error('Import confirmation missing');})()`);
 await wait(2000);if(await snapshot()!==raw)throw Error('Import changed identical save');report.files.push({scenario:'native-import-round-trip',passed:true});checkpoint();
 await evaluate(`[...${ROOT}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Tu partida').click()`);await wait(300);
 await evaluate(`${ROOT}.querySelector('input[type=file]').click()`);await wait(1000);call('shell','input','keyevent','4');await wait(500);
 if(await snapshot()!==raw)throw Error('Cancelling picker changed save');report.files.push({scenario:'cancel-native-import',passed:true});
 if(process.argv.includes('--export-process-death')){
  const deathName='elevenfate-hard-death-'+Date.now()+'.json';
  const payload=process.argv.includes('--large-export')?JSON.stringify({format:'ELEVENFATE native transfer QA; not an importable save',sourceSnapshot:JSON.parse(raw),padding:'q'.repeat(2*1024*1024)}):raw;
  report.processDeathPayloadKind=payload===raw?'real-save':'synthetic-large-transfer-wrapper';
  await evaluate(`AndroidBridge.saveTextFile(${JSON.stringify(deathName)},${JSON.stringify(payload)})`);await wait(1200);
  xml=nativeXml();if(!xml.includes('documentsui'))throw Error('Export picker not visible before process death');
  const pid=call('shell','pidof',pkg).trim();if(!/^\d+$/.test(pid))throw Error('Unexpected target PID');
  call('shell','am','kill',pkg);await wait(500);
  let alive='';try{alive=call('shell','pidof',pkg).trim();}catch{}
  if(alive){call('shell','run-as',pkg,'kill','-9',pid);await wait(500);}
  ws.close();xml=nativeXml();fs.writeFileSync(path.join(evidence,'export-death-picker.xml'),xml);
  tapNode(xml,n=>/text="save"/i.test(n)&&/clickable="true"/.test(n));await wait(2500);
  const exportStarted=Date.now();let recovered='';for(let i=0;i<80;i++){try{recovered=call('exec-out','cat','/sdcard/Download/'+deathName);}catch{}if(recovered===payload)break;await wait(500);}report.exportCompletionWaitMs=Date.now()-exportStarted;
  report.files.push({scenario:'export-after-process-death',passed:recovered===payload,expectedBytes:Buffer.byteLength(payload),actualBytes:Buffer.byteLength(recovered)});checkpoint();
  if(recovered!==payload)throw Error('Export after process death lost the pending save data');
 }
 report.passed=true;
}catch(error){report.error=error.message;process.exitCode=1;}
finally{ws?.close();try{call('forward','--remove','tcp:9224');call('shell','cmd','connectivity','airplane-mode','disable');}catch{}checkpoint();console.log(JSON.stringify({passed:report.passed,clips:report.clips.length,files:report.files,error:report.error}));}
