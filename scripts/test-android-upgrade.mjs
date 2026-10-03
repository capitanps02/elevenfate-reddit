import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const [serial,oldInput]=process.argv.slice(2);
if(!/^emulator-\d+$/.test(serial||'')||!oldInput)throw Error('Usa un emulador dedicado y la APK QA anterior.');
const sdk=process.env.ANDROID_HOME;
if(!sdk)throw Error('Falta ANDROID_HOME.');
const old=path.resolve(oldInput),current=path.join(root,'android/app/build/outputs/apk/qa/app-qa.apk');
const adb=path.join(sdk,'platform-tools/adb');
const call=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:720000});
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={date:new Date().toISOString(),oldApkSha256:hash(old),newApkSha256:hash(current),passed:false,phases:[]};
try{
 const deadline=Date.now()+300000;
 while(call('shell','getprop','sys.boot_completed').trim()!=='1'){if(Date.now()>deadline)throw Error('Emulador sin arrancar');await new Promise(r=>setTimeout(r,1000));}
 if(!call('emu','avd','name').startsWith('Elevenfate_QA_'))throw Error('AVD no dedicado');
 call('install','-r',old);call('install','-r',path.join(root,'android/app/build/outputs/apk/androidTest/qa/app-qa-androidTest.apk'));
 call('shell','cmd','connectivity','airplane-mode','enable');
 for(const phase of ['create','career','resume','upgrade']){
  call('shell','am','force-stop','com.elevenfate.game.qa');
  if(phase==='upgrade')call('install','-r',current);
  console.log('Comprobando actualización:',phase);
  const output=call('shell','am','instrument','-r','-w','-e','phase',phase==='upgrade'?'resume':phase,'com.elevenfate.game.qa.test/com.multihistoria.AndroidSmokeProbe');
  report.phases.push({phase,output});console.log(output);
  if(!output.includes('INSTRUMENTATION_CODE: -1'))throw Error('Fallo en '+phase);
 }
 report.passed=true;
}catch(error){report.error=error.message;process.exitCode=1;}
finally{try{call('shell','cmd','connectivity','airplane-mode','disable');}catch{}fs.writeFileSync(path.join(root,'docs/android/runtime-upgrade.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,error:report.error}));}
