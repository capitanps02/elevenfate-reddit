import express from 'express';import fs from 'node:fs/promises';
import {GameSession} from '../dist/session/game-session.js';
import {createCareerService} from '../reddit/server/career-service.mjs';
import {createMemoryRedis} from '../reddit/test/memory-redis.mjs';
import {createDailyService,dailyConfig} from '../reddit/server/daily-service.mjs';
const cases=JSON.parse(await fs.readFile(new URL('../visual/cases.json',import.meta.url))),contexts=new Map(),app=express(),uid='t2_visual';
const dailySeeds=new Map();
async function recordedRedis(seed){
 const redis=createMemoryRedis(),values=new Map(),scores=new Map(),set=redis.set.bind(redis),zAdd=redis.zAdd.bind(redis);
 redis.set=async(k,v)=>{values.set(k,v);return set(k,v);};
 redis.zAdd=async(k,...rows)=>{const map=scores.get(k)||new Map();for(const row of rows)map.set(row.member,row.score);scores.set(k,map);return zAdd(k,...rows);};
 for(const [k,v]of seed?.values||[])await redis.set(k,v);
 for(const [k,rows]of seed?.scores||[])await redis.zAdd(k,...rows);
 return {redis,snapshot:()=>({values:[...values],scores:[...scores].map(([k,v])=>[k,[...v].map(([member,score])=>({member,score}))])})};
}
app.use(express.json({limit:'2mb'}));
async function context(spec){
 if(contexts.has(spec.id))return contexts.get(spec.id);
 const promise=(async()=>{
  const career=createCareerService({redis:createMemoryRedis(),validate:raw=>GameSession.migrateFromSave(raw,spec.eventsEmpty?{events:[]}:undefined)});
  if(spec.fixture!=='none'){let name=spec.fixture;try{await fs.access(new URL('../visual/fixtures/'+name+'.json',import.meta.url));}catch{name='advanced';}await career.write(uid,{raw:await fs.readFile(new URL('../visual/fixtures/'+name+'.json',import.meta.url),'utf8'),expectedGeneration:0});}
  const now=new Date('2026-10-14T12:00:00Z'),cached=dailySeeds.get(spec.daily),tracked=await recordedRedis(cached),daily=createDailyService({redis:tracked.redis,now:()=>now});
  if(spec.daily&&spec.daily!=='intro'&&!cached){
   let state=await daily.act(uid,{dailyId:dailyConfig(now).id,action:'start'});
   for(let n=0;n<40;n++){
    if(spec.daily==='club')break;
    if(spec.daily==='decision'&&state.view.screen==='decision')break;
    if(spec.daily==='summary'&&state.view.screen==='summary')break;
    if(spec.daily==='market'&&state.view.screen==='club'&&state.resolved>0)break;
    if(state.finished)break;
    const v=state.view,command={commandId:'fixture-'+n,expectedRevision:v.revision};
    if(v.screen==='club')Object.assign(command,{type:'choose',choiceId:v.clubs[0].id});
    else if(v.screen==='decision')Object.assign(command,{type:'choose',choiceId:v.decision.choices[0].id});
    else command.type='acknowledge';
    state=await daily.act(uid,{dailyId:state.config.id,action:'command',command});
   }
   dailySeeds.set(spec.daily,tracked.snapshot());
  }
  return {career,daily,spec};
 })();contexts.set(spec.id,promise);return promise;
}
function specFor(id){return cases.find(c=>c.id===id)||cases.find(c=>c.id==='06-inicio');}
app.get('/api/visual/case',async(q,r,n)=>{try{const spec=specFor(q.query.id);contexts.delete(spec.id);await context(spec);r.json(spec);}catch(e){n(e);}});
app.use('/api',async(q,r,n)=>{try{q.visual=await context(specFor(q.query.visualcase));n();}catch(e){n(e);}});
app.get('/api/career',async(q,r,n)=>{try{if(q.visual.spec.failure)throw Object.assign(Error('Error de carga de muestra'),{status:503});r.json(await q.visual.career.read(uid));}catch(e){n(e);}});
app.put('/api/career',async(q,r,n)=>{try{r.json(await q.visual.career.write(uid,q.body));}catch(e){n(e);}});
app.delete('/api/career',async(q,r,n)=>{try{r.json(await q.visual.career.remove(uid,q.body));}catch(e){n(e);}});
app.get('/api/daily',async(q,r,n)=>{try{r.json(await q.visual.daily.read(uid,q.query.mode??'daily',q.query.season));}catch(e){n(e);}});
app.post('/api/daily',async(q,r,n)=>{try{r.json(await q.visual.daily.act(uid,q.body));}catch(e){n(e);}});
app.get('/api/account/export',async(q,r)=>r.json({scope:'local-visual-sample',career:await q.visual.career.read(uid),daily:await q.visual.daily.read(uid)}));
app.use(express.static(new URL('../reddit/public/',import.meta.url).pathname));
app.use((e,_q,r,_n)=>r.status(e.status||500).json({error:e.message}));
await context(specFor('25-ranking'));
contexts.clear();
const port=Number(process.env.EF_VISUAL_PORT||4196);
const server=app.listen(port,'127.0.0.1',()=>console.log(`C2 catalogue http://127.0.0.1:${port}/visual.html?case=06-inicio`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
