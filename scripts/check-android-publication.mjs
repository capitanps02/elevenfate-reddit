import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'docs/android/publication');fs.mkdirSync(dir,{recursive:true});
const load=(file)=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const state=load(path.join(dir,'publication-state.json'))||{};
const integrity=load(path.join(dir,'playtest-bundle-integrity.json'));
const runtime=load(path.join(dir,'playtest-runtime.json'));
const bundle=path.join(root,'android/app/build/outputs/bundle/playtest/app-playtest.aab');
const bundleHash=fs.existsSync(bundle)?createHash('sha256').update(fs.readFileSync(bundle)).digest('hex'):null;
const propertiesFile=path.join(root,'android/release.properties');
const properties=fs.existsSync(propertiesFile)?fs.readFileSync(propertiesFile,'utf8'):'';
const get=(name)=>properties.split(/\r?\n/).find(line=>line.startsWith(name+'='))?.slice(name.length+1)||'';
const checks=[];
const check=(id,stage,pass,detail)=>checks.push({id,stage,status:pass?'PASS':'PENDING',detail});
const signing=path.join(root,'android/.local/signing');
check('SIGN-01','internal',fs.existsSync(path.join(signing,'elevenfate-upload.p12'))&&!!get('storePassword')&&!!get('keyPassword')&&!!get('keyAlias'),'Clave de subida configurada; credenciales no incluidas en el informe.');
check('BUNDLE-01','internal',!!bundleHash&&integrity?.passed&&integrity.sha256===bundleHash&&integrity.signedByUploadKey&&integrity.lintErrors===0,'AAB exacto firmado, recursos verificados y Lint sin errores.');
check('RUNTIME-01','internal',!!bundleHash&&runtime?.passed&&runtime.bundleSha256===bundleHash&&runtime.nativeSurfaceChecks>=7,'APK dividida desde AAB, elección/recuperación y superficie nativa sin diálogo de ANR comprobadas.');
check('PRIVACY-LINK-01','internal',!!bundleHash&&runtime?.bundleSha256===bundleHash&&runtime.privacyPolicyButtonAndIntentPassed===true&&runtime.privacyPolicyUrl===get('privacyPolicyUrl'),'Botón de privacidad de la build exacta y destino HTTPS comprobados con Instrumentation.');
check('ACCOUNT-01','internal',state.playConsole?.accountAvailable===true,'Alta de cuenta Play Console; estado observado: '+(state.playConsole?.status||'sin comprobar')+'.');
check('ACCOUNT-02','internal',state.playConsole?.uploadAccessVerified===true,'Acceso al panel y al canal interno confirmado en el portal.');
check('PACKAGE-01','internal',state.packageNameSelectedForFirstUpload==='com.elevenfate.game','Identificador seleccionado desde la configuración existente. La primera subida lo fija en Play.');
check('SIGN-02','operations',state.uploadKeyBackupConfirmed===true,'Copia cifrada de clave y contraseña fuera de este equipo recomendada; todavía no confirmada.');
let https=false;try{const url=new URL(get('privacyPolicyUrl'));https=url.protocol==='https:'&&!/^(localhost|127\.|.*\.(example|test)$)/.test(url.hostname);}catch{}
check('PRIVACY-01','production',https,'URL pública HTTPS configurada en release.properties.');
check('PRIVACY-02','production',state.privacyPolicyPublishedAndReviewed===true,'Responsable/contacto, política accesible en app y ficha, verificación online y revisión del texto.');
check('AUDIENCE-01','production',get('audienceAndFamiliesReviewed')==='true'&&state.audienceAndIarcCompleted===true,'Revisión real de público, Families e IARC; no se da por hecha con un cambio de propiedad.');
for(const name of ['admobAppId','interstitialId','bannerId']){
    const separator=name==='admobAppId'?'~':'/';const value=get(name);
    check('ADMOB-'+name,'production',/^ca-app-pub-\d{16}[~/]\d{10}$/.test(value)&&value.includes(separator)&&!value.includes('3940256099942544'),'Identificador real configurado: '+name+'.');
}
check('ADS-01','production',state.umpAndTestAdsPassed===true,'Aceptar/rechazar/reabrir UMP, anuncios de prueba, interrupción/retorno y perfiles de edad verificados.');
check('DATA-01','production',state.dataSafetyCompleted===true,'Declaración Data Safety coherente con la variante comercial y los SDK.');
check('STORE-01','production',state.storeListingCompleted===true,'Ficha, recursos gráficos, contacto, países y declaración de anuncios completados.');
check('DEVICE-01','production',state.physicalDeviceQACompleted===true,'Prueba en móvil ARM físico y cobertura de compatibilidad documentada.');
check('CLOSED-01','production',state.closedTestRequirementSatisfied===true,'Prueba cerrada exigida por la cuenta completada o exención acreditada, nunca supuesta.');
check('PLAY-01','production',state.productionAccessApproved===true,'Acceso a producción aprobado por Play.');
check('RELEASE-01','production',state.commercialReleaseBundleValidated===true,'Nuevo AAB release firmado, versionCode superior al último subido y pruebas propias; playtest no es comercial.');
check('ADMOB-REVIEW','monetization',state.admobReadyForFullServing===true,'Tienda vinculada, revisión de preparación/app-ads.txt y estado de cuenta resueltos según AdMob.');
const ready=stage=>checks.filter(c=>c.stage===stage).every(c=>c.status==='PASS');
const report={checkedAt:new Date().toISOString(),bundleSha256:bundleHash,internalArtifactReady:checks.filter(c=>['SIGN-01','BUNDLE-01','RUNTIME-01'].includes(c.id)).every(c=>c.status==='PASS'),internalUploadReady:ready('internal'),productionReady:ready('internal')&&ready('production'),monetizationReady:ready('internal')&&ready('production')&&ready('monetization'),uploadedToPlay:state.playConsole?.artifactUploaded===true&&state.playConsole.uploadedBundleSha256===bundleHash,checks,note:'Estados manuales sin evidencia permanecen pendientes. Pasar la firma/estructura local no acredita aceptación de Play. No se imprime ninguna contraseña.'};
fs.writeFileSync(path.join(dir,'preflight.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.internalUploadReady)process.exitCode=2;
if(process.argv.includes('--production')&&!report.productionReady)process.exitCode=2;
