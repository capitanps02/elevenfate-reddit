import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const reports=path.join(root,'docs/android/publication');
const integrity=JSON.parse(fs.readFileSync(path.join(reports,'playtest-bundle-integrity.json'),'utf8'));
const runtime=JSON.parse(fs.readFileSync(path.join(reports,'playtest-runtime.json'),'utf8'));
const bundle=path.join(root,'android/app/build/outputs/bundle/playtest/app-playtest.aab');
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hash=sha(bundle);
if(!integrity.passed||!runtime.passed||!(runtime.nativeSurfaceChecks>=7)||!runtime.privacyPolicyButtonAndIntentPassed||integrity.sha256!==hash||runtime.bundleSha256!==hash)throw Error('El AAB actual no coincide con su validación y prueba de superficie nativa/enlace de privacidad. No se exporta como paquete probado.');
const destination=path.join(root,'..','PLAY-CONSOLE');fs.mkdirSync(destination,{recursive:true});
const prefix=`ELEVENFATE-${integrity.buildInfo.appVersion}-internal-v${integrity.versionCode}`;
const artifacts=[];
for(const [source,name,scope] of [
    [bundle,prefix+'.aab','Signed bundle, validated and runtime tested through generated device splits'],
    [path.join(root,'android/app/build/outputs/apk/playtest/app-playtest.apk'),prefix+'.apk','Standalone APK from the same Gradle variant; direct APK runtime not separately tested'],
    [path.join(root,'android/.local/signing/upload-certificate.pem'),'elevenfate-upload-certificate.pem','Public certificate only, not a private key'],
]){
    fs.copyFileSync(source,path.join(destination,name));artifacts.push({file:name,bytes:fs.statSync(source).size,sha256:sha(source),scope});
}
for(const name of ['playtest-runtime.json','playtest-bundle-integrity.json','preflight.json','publication-state.json']){
    const source=path.join(reports,name);if(fs.existsSync(source))fs.copyFileSync(source,path.join(destination,name));
}
const artifactFiles=fs.readdirSync(destination).filter(name=>/\.(aab|apk|pem)$/.test(name)).sort();
fs.writeFileSync(path.join(destination,'SHA256SUMS'),artifactFiles.map(name=>sha(path.join(destination,name))+'  '+name).join('\n')+'\n');
const preflightPath=path.join(reports,'preflight.json');
const preflight=fs.existsSync(preflightPath)?JSON.parse(fs.readFileSync(preflightPath,'utf8')):{};
const report={buildId:integrity.buildInfo.buildId,versionCode:integrity.versionCode,variant:'playtest',productionReady:false,uploadedToPlay:preflight.bundleSha256===hash&&preflight.uploadedToPlay===true,artifacts};
fs.writeFileSync(path.join(destination,'ENTREGA.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
