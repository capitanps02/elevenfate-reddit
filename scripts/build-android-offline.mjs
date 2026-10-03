import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { EVENT_CUTSCENES, PROLOGUE_CUTSCENE } from '../dist/content/event-cutscenes.js';
import { ENGINE_BUILD } from '../dist/core/build.js';
import { FOOTBALL_CATALOG_VERSION } from '../dist/catalog/football/index.js';

const root = path.resolve(import.meta.dirname, '..');
const assetsRoot = path.join(root, 'android', 'app', 'src', 'main', 'assets');

function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(file, contents) {
  mkdir(path.dirname(file));
  fs.writeFileSync(file, contents);
}
function copy(source, destination) {
  mkdir(path.dirname(destination));
  fs.copyFileSync(source, destination);
}
function digest(file) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

// WebViewAssetLoader serves every game resource from a secure local origin without network access.
fs.rmSync(assetsRoot, { recursive: true, force: true });
mkdir(assetsRoot);
fs.cpSync(path.join(root, 'dist'), path.join(assetsRoot, 'dist'), { recursive: true });
// Finder metadata is not a runtime resource and should never enter the APK.
fs.rmSync(path.join(assetsRoot, 'dist', '.DS_Store'), { force: true });
copy(path.join(root, 'web', 'page.css'), path.join(assetsRoot, 'web', 'page.css'));
copy(path.join(root, 'web', 'game-ui.css'), path.join(assetsRoot, 'web', 'game-ui.css'));
copy(path.join(root, 'web', 'game-ui.js'), path.join(assetsRoot, 'web', 'game-ui.js'));
copy(path.join(root, 'web', 'cutscene-player.js'), path.join(assetsRoot, 'web', 'cutscene-player.js'));
copy(path.join(root, 'web', 'club-catalog-names.js'), path.join(assetsRoot, 'web', 'club-catalog-names.js'));
copy(path.join(root, 'web', 'club-names.js'), path.join(assetsRoot, 'web', 'club-names.js'));
copy(path.join(root, 'web', 'indexed-save-store.js'), path.join(assetsRoot, 'web', 'indexed-save-store.js'));
const activeClips = [...new Set([PROLOGUE_CUTSCENE, ...EVENT_CUTSCENES].map(clip => clip.file))].sort();
for (const file of activeClips) copy(path.join(root, 'web', 'assets', 'cutscenes', file), path.join(assetsRoot, 'web', 'assets', 'cutscenes', file));


const assets = JSON.parse(fs.readFileSync(path.join(root, 'web', 'assets.json'), 'utf8'));
// Content-addressed files deduplicate identical images and avoid Base64 in the JS parser.
const extractedImages = new Map();
for (const [key, value] of Object.entries(assets)) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw Error(`Unsupported offline image: ${key}`);
  const bytes = Buffer.from(match[2], 'base64');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const file = `${hash}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  write(path.join(assetsRoot, 'web', 'assets', 'images', file), bytes);
  extractedImages.set(file, bytes.length);
  assets[key] = './assets/images/' + file;
}
const css = fs.readFileSync(path.join(root, 'web', 'game-ui.css'), 'utf8');
const local = `import { GameSession } from '../dist/session/game-session.js';
import { mountGame } from './game-ui.js';
import { buildInfo } from './build-info.js';
globalThis.ELEVENFATE_BUILD_INFO=Object.freeze(buildInfo);
const assets=${JSON.stringify(assets)};
for(const key of Object.keys(assets))assets[key]=new URL(assets[key],import.meta.url).href;
const css=${JSON.stringify(css)};
const cutsceneUrl=clip=>new URL('./assets/cutscenes/'+clip.file,import.meta.url).href;
mountGame({root:document.querySelector('#game').attachShadow({mode:'open'}),GameSession,assets,css,cutsceneUrl,storageKey:'historia-jugador.android.offline.session.v1'});
`;
write(path.join(assetsRoot, 'web', 'local.js'), local);

const index = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#09090b">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'">
<title>ELEVENFATE · Carrera de futbolista</title>
<link rel="stylesheet" href="./web/page.css"></head>
<body><div id="game"></div><script type="module" src="./web/local.js"></script></body></html>
`;
write(path.join(assetsRoot, 'index.html'), index);

const files = [];
function collect(dir, relative = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    const rel = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) collect(absolute, rel);
    else files.push({ path: rel, bytes: fs.statSync(absolute).size, sha256: digest(absolute) });
  }
}
collect(assetsRoot);
const sourceFiles = [];
function collectNative(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())collectNative(file);else sourceFiles.push([path.relative(root,file),digest(file)]);
  }
}
collectNative(path.join(root,'android/app/src/main/java'));
collectNative(path.join(root,'android/app/src/main/res'));
for(const file of ['android/app/build.gradle','android/app/proguard-rules.pro','android/app/src/main/AndroidManifest.xml','android/app/src/playtest/AndroidManifest.xml','scripts/build-android-offline.mjs']) sourceFiles.push([file,digest(path.join(root,file))]);
const sourceHash = createHash('sha256').update(JSON.stringify({files,sourceFiles})).digest('hex');
const timestamp = new Date().toISOString();
const gitSha = execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const gitDirty = execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().length > 0;
const androidGradle=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
const versionCode=Number(androidGradle.match(/versionCode\s+(\d+)/)?.[1]);
const appVersion=androidGradle.match(/versionName\s+'([^']+)'/)?.[1];
if(!Number.isSafeInteger(versionCode)||versionCode<1||!appVersion)throw Error('Versión Android ausente o inválida.');
const buildInfo={appVersion,versionCode,engineVersion:ENGINE_BUILD,catalogVersion:FOOTBALL_CATALOG_VERSION,gitSha,gitDirty,sourceHash,buildId:timestamp.slice(0,10).replaceAll('-','')+'.'+sourceHash.slice(0,12),timestamp};
write(path.join(assetsRoot,'web/build-info.js'),`export const buildInfo=${JSON.stringify(buildInfo)};\n`);
write(path.join(assetsRoot,'build-info.json'),JSON.stringify(buildInfo,null,2)+'\n');
files.length=0;collect(assetsRoot);
// Historical device reports cannot certify newly generated assets or APKs.
const androidRuntimeVerified = false;
const manifest = {
  integration: 'T3.3',
  package: 'android-webview-offline',
  entry: 'index.html',
  storage: { type: 'IndexedDB', key: 'historia-jugador.android.offline.session.v1', legacyMigration: 'localStorage', androidRuntimeVerified },
  origin: 'https://appassets.androidplatform.net/assets/',
  networkPolicy: { internetPermission: true, gameNetworkAccess: false, nativeNetworkPurpose: 'AdMob-and-UMP', connectSrc: 'none', externalUrls: [] },
  buildInfo,
  optimizations: {extractedImages: extractedImages.size, imageBytes: [...extractedImages.values()].reduce((a,b)=>a+b,0), activeClips},
  resources: { images: 'web/assets/images', fonts: 'system-only', cutscenes: 'web/assets/cutscenes' },
  files,
  generatedAt: new Date().toISOString(),
  androidRuntimeEvidence: 'Previous evidence predates the current APK; rerun device probes'
};
write(path.join(assetsRoot, 'offline-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ package: manifest.package, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), entry: manifest.entry }));
