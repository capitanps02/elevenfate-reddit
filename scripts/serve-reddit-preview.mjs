import {createAnalyticsService} from '../reddit/server/analytics-service.mjs';
import {createAnalyticsRouter} from '../reddit/server/analytics-router.mjs';
import {createAccountData} from '../reddit/server/account-data.mjs';
import {analyticsRedis} from '../reddit/test/analytics-fixture.mjs';
// Local preview only: memory persistence is explicitly not Devvit/Redis evidence.
import express from 'express';
import {readFile} from 'node:fs/promises';
import {GameSession} from '../dist/session/game-session.js';
import {createCareerService} from '../reddit/server/career-service.mjs';
import {createMemoryRedis} from '../reddit/test/memory-redis.mjs';
import {createDailyService} from '../reddit/server/daily-service.mjs';
const app=express(),service=createCareerService({redis:createMemoryRedis(),validate:raw=>GameSession.migrateFromSave(raw)});
const previewAnalyticsRedis=analyticsRedis();const previewAccounts=createAccountData({redis:previewAnalyticsRedis});const previewSession=await previewAccounts.open('t2_preview');
const analytics=createAnalyticsService({redis:previewAnalyticsRedis,accounts:previewAccounts});
app.use('/api/analytics',createAnalyticsRouter({service:analytics,accounts:previewAccounts,identity:()=> 't2_preview',isAdmin:async()=>true}));
app.use(express.json({limit:'2mb'}));
// Optional local-only latency to inspect pending UI, never included in Devvit.
const qaDelay=Math.min(10000,Math.max(0,Number(process.env.ELEVENFATE_PREVIEW_SAVE_DELAY_MS)||0));
app.use('/api',async(req,_res,next)=>{if(qaDelay&&['POST','PUT'].includes(req.method))await new Promise(resolve=>setTimeout(resolve,qaDelay));next();});
const userId='t2_preview';
// Optional local QA fixture. Still validated by the original session loader.
if(process.env.ELEVENFATE_PREVIEW_FIXTURE)await service.write(userId,{raw:await readFile(process.env.ELEVENFATE_PREVIEW_FIXTURE,'utf8'),expectedGeneration:0});
const qaNow=process.env.ELEVENFATE_PREVIEW_NOW;
if(qaNow&&Number.isNaN(Date.parse(qaNow)))throw Error('Fecha QA inválida.');
const daily=createDailyService({redis:createMemoryRedis(),...(qaNow?{now:()=>new Date(qaNow)}:{})});
app.get('/api/daily',async(req,res,next)=>{try{res.json(await daily.read(userId,req.query.mode??'daily',req.query.season));}catch(e){next(e);}});
app.post('/api/daily',async(req,res,next)=>{try{res.json(await daily.act(userId,req.body));}catch(e){next(e);}});
app.get('/api/init',(_req,res)=>res.json({userId,subredditId:'t5_preview',preview:true,session:previewSession,analyticsAdmin:true}));
app.get('/api/career',async(_req,res,next)=>{try{res.json(await service.read(userId));}catch(e){next(e);}});
app.put('/api/career',async(req,res,next)=>{try{res.json(await service.write(userId,req.body));}catch(e){next(e);}});
app.delete('/api/career',async(req,res,next)=>{try{res.json(await service.remove(userId,req.body));}catch(e){next(e);}});
app.use(express.static(new URL('../reddit/public/',import.meta.url).pathname));
app.use((e,_req,res,_next)=>res.status(e.status||500).json({error:e.message}));
const previewPort=Number(process.env.ELEVENFATE_PREVIEW_PORT??4173);
app.listen(previewPort,'127.0.0.1',error=>{if(error)throw error;console.log(`LOCAL PREVIEW — memory saves; http://127.0.0.1:${previewPort}/game.html`);});
