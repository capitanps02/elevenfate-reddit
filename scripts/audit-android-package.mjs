import fs from 'node:fs';import path from 'node:path';
import {validateBuild} from '../dist/validation/build-validation.js';
import {EVENTS} from '../dist/content/events/index.js';
import {SEED_CATALOG} from '../dist/catalog/seeds.js';
import {NPC_CATALOG} from '../dist/catalog/npcs.js';
import {ENDING_FAMILIES} from '../dist/epilogue/generator.js';
import {FOOTBALL_CLUBS,FOOTBALL_DIVISIONS,FOOTBALL_COUNTRY_CODES,inspectFootballCatalogData} from '../dist/catalog/football/index.js';
const root=path.resolve(import.meta.dirname,'..'),base=path.join(root,'android/app/src/main/assets');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'offline-manifest.json')));
const issues=validateBuild(EVENTS),footballIssues=inspectFootballCatalogData(FOOTBALL_CLUBS,FOOTBALL_DIVISIONS);
const references=[],missing=[];
const imports=text=>[...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(s=>s.startsWith('.'));
for(const file of manifest.files.filter(f=>f.path.endsWith('.js')))for(const ref of imports(fs.readFileSync(path.join(base,file.path),'utf8'))){references.push({file:file.path,ref});if(!fs.existsSync(path.resolve(base,path.dirname(file.path),ref)))missing.push({file:file.path,ref});}
const seen=new Set();function startup(file){if(seen.has(file))return;seen.add(file);const text=fs.readFileSync(path.join(base,file),'utf8').replace(/\bimport\s*\([^)]*\)/g,'');for(const spec of imports(text))startup(path.relative(base,path.resolve(base,path.dirname(file),spec)));}startup('web/local.js');
const report={buildInfo:manifest.buildInfo,counts:{events:EVENTS.length,seeds:SEED_CATALOG.length,npcs:NPC_CATALOG.length,endingFamilies:ENDING_FAMILIES.length,clubs:FOOTBALL_CLUBS.length,divisions:FOOTBALL_DIVISIONS.length,countries:FOOTBALL_COUNTRY_CODES.length},errors:issues.filter(i=>i.level==='error').length,warnings:issues.filter(i=>i.level==='warning').length,footballIssues,moduleReferences:references.length,missingReferences:missing,packagedBytes:manifest.files.reduce((sum,f)=>sum+f.bytes,0),localJsBytes:fs.statSync(path.join(base,'web/local.js')).size,startupJsBytes:[...seen].reduce((sum,f)=>sum+fs.statSync(path.join(base,f)).size,0),startupModules:seen.size,historicalRegistryInStaticStartup:[...seen].some(f=>f.includes('legacy-registry')),images:manifest.optimizations.extractedImages,imageBytes:manifest.optimizations.imageBytes,cutscenes:manifest.optimizations.activeClips.length};
report.passed=!report.errors&&!report.warnings&&!footballIssues.length&&!missing.length&&!report.historicalRegistryInStaticStartup;
fs.writeFileSync(path.join(root,'docs/android/package-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
