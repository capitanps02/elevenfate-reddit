import fs from 'node:fs/promises';
import {GameSession} from '../dist/session/game-session.js';
const dir=new URL('../visual/fixtures/',import.meta.url);await fs.mkdir(dir,{recursive:true});
const saved=new Set();
async function save(name,s){if(saved.has(name))return;saved.add(name);await fs.writeFile(new URL(name+'.json',dir),JSON.stringify(s.exportSnapshot()));console.log(name,s.getView().date,s.getView().screen);}
let s=await GameSession.create(424242,{playerDisplayName:'Alex Vega',redditCompetitions:true});
await save('base',s);
for(let step=0;step<220;step++){
 const v=s.getView();
 if(v.screen==='decision')await save('decision',s);
 if(v.screen==='result')await save('result',s);
 if(v.screen==='offer')await save('offer',s);
 if(v.screen==='career'&&v.appearances>0)await save('advanced',s);
 if(saved.has('offer')&&saved.has('advanced'))break;
 const command={commandId:'visual-'+step,expectedRevision:v.revision};
 if(v.screen==='decision')Object.assign(command,{type:'choose',pendingInstanceId:v.decision.instanceId,choiceId:v.decision.choices[0].id});
 else if(v.screen==='result')command.type='acknowledge';
 else if(v.screen==='offer')Object.assign(command,{type:'offer',action:'reject',offerId:v.offer.id});
 else if(v.screen==='epilogue')break;
 else Object.assign(command,{type:'continue',maxDays:90});
 try{await s.dispatch(command);}catch(e){console.log('fixture stop',e.code,e.message);break;}
}
console.log('Available:',[...saved].join(', '));
