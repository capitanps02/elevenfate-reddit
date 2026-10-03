// Resumable full-career QA using the established simulator; each seed has its own checkpoint.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const args=process.argv.slice(2).filter(a=>!a.startsWith('--'));
const runs=Number(args[0]??10),start=Number(args[1]??3210000);
const days=Number(process.argv.find(a=>a.startsWith('--days='))?.split('=')[1]??14000);
const timeoutMs=Number(process.argv.find(a=>a.startsWith('--timeout-ms='))?.split('=')[1]??300000);
if(!Number.isInteger(timeoutMs)||timeoutMs<60000||timeoutMs>1800000)throw Error('Timeout fuera de 60000–1800000 ms.');
if(!Number.isInteger(days)||days<1||days>14000)throw Error('Días fuera de 1–14000.');
if(!Number.isInteger(runs)||runs<1||runs>1000||!Number.isSafeInteger(start)||start<0||start+runs>0xffffffff)throw Error('Usa 1–1000 carreras y una semilla válida.');
const identity=JSON.parse(fs.readFileSync(path.join(root,'dist/build-manifest.json'))).sourceIdentity;
const out=path.resolve(args[2]??path.join(root,'qa/android-careers',identity,String(days)+'days'));fs.mkdirSync(out,{recursive:true});
const manifestFile=path.join(out,'source.json');
if(fs.existsSync(manifestFile)&&(JSON.parse(fs.readFileSync(manifestFile)).sourceIdentity!==identity||JSON.parse(fs.readFileSync(manifestFile)).days!==days))throw Error('No mezcles checkpoints de motores distintos.');
fs.writeFileSync(manifestFile,JSON.stringify({sourceIdentity:identity,days}));
const report={sourceIdentity:identity,requested:runs,start,days,timeoutMs,fullCareer:days===14000,completed:0,blocked:0,issues:[],careers:[]};
function checkpoint(){fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');}
for(let i=0;i<runs;i++){
 const seed=start+i,file=path.join(out,`seed-${seed}.json`);
 if(!fs.existsSync(file)){
  const result=spawnSync(process.execPath,[path.join(root,'scripts/qa-android-career-worker.mjs'),String(seed),String(days),file],{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:1024*1024});
  if(result.status!==0){report.issues.push({seed,status:result.error?.code==='ETIMEDOUT'?'incomplete-timeout':'execution-error',error:result.error?.message??result.stderr});checkpoint();console.log(`Pendiente seed ${seed}: ${report.issues.at(-1).status}`);continue;}
 }
 const career=JSON.parse(fs.readFileSync(file));
 if(career.start!==seed||career.count!==1)throw Error('Checkpoint incompatible: '+file);
 if(career.invariantIssues.length)report.issues.push({seed,status:'invariant-error',issues:career.invariantIssues});
 report.completed++;report.blocked+=career.blocked;report.careers.push({seed,ms:career.ms,blocked:career.blocked,ages:career.ages,closures:career.closures});checkpoint();console.log(`Carrera ${report.completed}/${runs}: seed ${seed}, ${career.ms} ms, pendientes de cierre ${career.blocked}`);
}
report.passed=report.completed===runs&&report.blocked===0&&!report.issues.length;checkpoint();console.log(JSON.stringify({passed:report.passed,report:path.join(out,'summary.json')}));if(!report.passed)process.exitCode=2;
