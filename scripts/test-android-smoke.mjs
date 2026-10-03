import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),serial=process.argv[2];
const variant=process.argv.includes('--qa')?'qa':'debug';
if(!/^emulator-\d+$/.test(serial||''))throw Error('Solo se permite un emulador dedicado de ELEVENFATE.');
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
if(!sdk)throw Error('Configura ANDROID_HOME al SDK del emulador.');
const adb=path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb');
const call=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:180_000});
const bootDeadline=Date.now()+300_000;
while(true){
  try{if(call('shell','getprop','sys.boot_completed').trim()==='1')break;}catch{}
  if(Date.now()>bootDeadline)throw Error('El emulador no ha terminado de arrancar.');
  await new Promise(resolve=>setTimeout(resolve,1000));
}
const avd=call('emu','avd','name').trim();
if(!avd.startsWith('Elevenfate_QA_'))throw Error('El AVD debe ser exclusivo de ELEVENFATE: Elevenfate_QA_…');
const apk=path.join(root,`android/app/build/outputs/apk/${variant}/app-${variant}.apk`);
const test=path.join(root,`android/app/build/outputs/apk/androidTest/${variant}/app-${variant}-androidTest.apk`);
const packageId='com.elevenfate.game.'+variant;
const report={date:new Date().toISOString(),avd,serial,apkSha256:createHash('sha256').update(fs.readFileSync(apk)).digest('hex'),passed:false,phases:[]};
const reportFile=path.join(root,`docs/android/runtime-${variant}.json`);
try {
    const deadline=Date.now()+300_000;
    while(call('shell','getprop','sys.boot_completed').trim()!=='1'){
        if(Date.now()>deadline)throw Error('Android no ha terminado de arrancar.');
        await new Promise(resolve=>setTimeout(resolve,1000));
    }
    report.fingerprint=call('shell','getprop','ro.build.fingerprint').trim();
    report.webview=call('shell','dumpsys','webviewupdate');
    call('install','-r',apk);call('install','-r',test);
    call('shell','cmd','connectivity','airplane-mode','enable');
    report.airplaneMode=call('shell','settings','get','global','airplane_mode_on').trim();
    if(report.airplaneMode!=='1')throw Error('No se activó el modo avión en el emulador.');
    for(const phase of ['create','resume']){
        if(phase==='resume')call('shell','am','force-stop',packageId);
        console.log('Ejecutando prueba Android:',phase);
        const output=call('shell','am','instrument','-r','-w','-e','phase',phase,packageId+'.test/com.multihistoria.AndroidSmokeProbe');
        report.phases.push({phase,output});console.log(output);
        if(!output.includes('PASS '+phase+':')||!output.includes('INSTRUMENTATION_CODE: -1'))throw Error('Falló fase '+phase);
    }
    report.passed=true;
} catch(error) { report.error=String(error.message);process.exitCode=1; }
finally {
    try{call('shell','cmd','connectivity','airplane-mode','disable');}catch{}
    fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:report.passed,report:reportFile,error:report.error}));
}
