import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const android=path.join(root,'android');
const local=path.join(android,'.local','signing');
const configPath=path.join(android,'release.properties');
const toolchainPath=path.join(android,'.local','toolchain.json');
const toolchain=fs.existsSync(toolchainPath)?JSON.parse(fs.readFileSync(toolchainPath,'utf8')):{};
const javaHome=process.env.JAVA_HOME||toolchain.javaHome;
if(!javaHome)throw Error('Configura JAVA_HOME para usar el keytool oficial de JDK17.');
const keytool=path.join(javaHome,'bin','keytool');
fs.mkdirSync(local,{recursive:true,mode:0o700});
fs.chmodSync(local,0o700);
let text=fs.existsSync(configPath)?fs.readFileSync(configPath,'utf8'):fs.readFileSync(path.join(android,'release.properties.example'),'utf8');
const props=Object.fromEntries(text.split(/\r?\n/).filter(line=>line&&!line.trim().startsWith('#')&&line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')).trim(),line.slice(line.indexOf('=')+1)]));
const keystore=path.join(local,'elevenfate-upload.p12');
const passwordFile=path.join(local,'upload-password.txt');
const alias='elevenfate-upload';
const storeReference='../.local/signing/elevenfate-upload.p12';
// Never replace a user's existing signing identity or recover a partial key by guessing.
if(props.storeFile && props.storeFile!==storeReference)throw Error('Ya existe otra clave configurada; se conserva. Revisa esa clave antes de continuar.');
if(props.keyAlias && props.keyAlias!==alias)throw Error('Ya existe otro alias configurado; se conserva.');
const keyExists=fs.existsSync(keystore), passExists=fs.existsSync(passwordFile);
if(keyExists!==passExists)throw Error('La preparación de firma está incompleta. No se sobrescribe la clave ni su contraseña.');
let created=false;
if(!keyExists){
    if(props.storePassword||props.keyPassword)throw Error('Hay credenciales previas sin clave local; se conservan y requieren revisión.');
    fs.writeFileSync(passwordFile,randomBytes(32).toString('base64url')+'\n',{flag:'wx',mode:0o600});
    const generation=spawnSync(keytool,['-genkeypair','-keystore',keystore,'-storetype','PKCS12','-storepass:file',passwordFile,'-keypass:file',passwordFile,'-alias',alias,'-dname','CN=ELEVENFATE Upload','-keyalg','RSA','-keysize','3072','-validity','10000'],{encoding:'utf8'});
    if(generation.error||generation.status!==0)throw Error('No se pudo crear la clave. Revisa el estado local; no se imprimen credenciales.');
    created=true;
}
fs.chmodSync(keystore,0o600);fs.chmodSync(passwordFile,0o600);
const password=fs.readFileSync(passwordFile,'utf8').trim();
if((props.storePassword&&props.storePassword!==password)||(props.keyPassword&&props.keyPassword!==password))throw Error('Las contraseñas configuradas no coinciden. No se modifica la configuración.');
const check=spawnSync(keytool,['-list','-v','-keystore',keystore,'-storepass:file',passwordFile,'-alias',alias],{encoding:'utf8',env:{...process.env,LANG:'en_US.UTF-8'}});
if(check.error||check.status!==0)throw Error('No se puede verificar la clave existente. No se modifica la configuración.');
for(const [key,value] of Object.entries({storeFile:storeReference,storePassword:password,keyAlias:alias,keyPassword:password})){
    const lines=text.split(/\r?\n/);const index=lines.findIndex(line=>line.startsWith(key+'='));
    if(index>=0)lines[index]=key+'='+value;else lines.push(key+'='+value);
    text=lines.join('\n');
}
fs.writeFileSync(configPath,text.endsWith('\n')?text:text+'\n',{mode:0o600});fs.chmodSync(configPath,0o600);
const certificate=path.join(local,'upload-certificate.pem');
const exported=spawnSync(keytool,['-exportcert','-rfc','-keystore',keystore,'-storepass:file',passwordFile,'-alias',alias,'-file',certificate],{encoding:'utf8'});
if(exported.error||exported.status!==0)throw Error('No se pudo exportar el certificado público.');
const report={created,alias,keystore:path.relative(root,keystore),passwordFile:path.relative(root,passwordFile),certificate:path.relative(root,certificate),keyAlgorithm:'RSA',keySize:3072,validityDays:10000,certificateSha256:check.stdout.match(/SHA256:\s*([^\r\n]+)/)?.[1]?.trim(),note:'Solo la clave de subida local. Play App Signing todavía no configurado. Conservar copia cifrada de clave y contraseña fuera de este equipo antes de registrar la clave en Play.'};
fs.writeFileSync(path.join(local,'upload-key-info.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
