import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'), android=path.join(root,'android');
const local=path.join(android,'.local');fs.mkdirSync(local,{recursive:true});
const localConfig=path.join(local,'toolchain.json');
const configured=fs.existsSync(localConfig)?JSON.parse(fs.readFileSync(localConfig,'utf8')):{};
const javaHome=process.env.JAVA_HOME||configured.javaHome;
const env={...process.env,GRADLE_USER_HOME:process.env.GRADLE_USER_HOME||configured.gradleUserHome||path.join(local,'gradle-cache'),ANDROID_USER_HOME:path.join(local,'android-user')};
if(javaHome){env.JAVA_HOME=javaHome;env.PATH=path.join(javaHome,'bin')+path.delimiter+env.PATH;}
fs.mkdirSync(env.ANDROID_USER_HOME,{recursive:true});
const java=spawnSync('java',['-version'],{encoding:'utf8',env});
if(java.error||java.status!==0 || !/version "17[."]/.test(java.stderr+java.stdout))throw Error('Se requiere JDK 17. Configura JAVA_HOME o el JDK de Gradle en Android Studio.');
if(!fs.existsSync(path.join(local,'debug.keystore'))){
  const key=spawnSync('keytool',['-genkeypair','-keystore',path.join(local,'debug.keystore'),'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Android Debug,O=Android,C=US','-keyalg','RSA','-keysize','2048','-validity','10000'],{env,stdio:'inherit'});
  if(key.status!==0)throw Error('No se pudo crear la clave local de pruebas.');
}
const release=process.argv.includes('--release'),qa=process.argv.includes('--qa'),playtest=process.argv.includes('--playtest');
if([release,qa,playtest].filter(Boolean).length>1)throw Error('Selecciona una sola variante: --release, --qa o --playtest.');
const variant=release?'release':qa?'qa':playtest?'playtest':'debug';
const title=variant[0].toUpperCase()+variant.slice(1);
const tasks=process.argv.includes('--bundle')?[`bundle${title}`]:(qa||playtest)?[`assemble${title}`,`bundle${title}`]:[`assemble${title}`];
if(process.argv.includes('--check'))tasks.push('testDebugUnitTest','lintDebug');
const wrapper=path.join(android,process.platform==='win32'?'gradlew.bat':'gradlew');
const run=spawnSync(wrapper,[...tasks,'--no-daemon',...(process.argv.includes('--offline')?['--offline']:[])],{cwd:android,env,stdio:'inherit'});
const files=[path.join(android,'app/build/outputs/apk',variant,`app-${variant}.apk`),path.join(android,'app/build/outputs/bundle',variant,`app-${variant}.aab`)];
const report={variant,passed:run.status===0,deviceRuntimeVerified:false,artifacts:run.status===0?files.filter(f=>fs.existsSync(f)).map(f=>({path:path.relative(root,f),bytes:fs.statSync(f).size,sha256:createHash('sha256').update(fs.readFileSync(f)).digest('hex')})):[]};
fs.writeFileSync(path.join(local,`build-${variant}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(run.error)console.error(run.error.message);process.exitCode=run.status===0?0:(run.status||1);
