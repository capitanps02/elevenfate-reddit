import express from 'express';
import {createServer,getServerPort,context,redis,reddit} from '@devvit/web/server';
import {GameSession} from '../../dist/session/game-session.js';
import {createCareerService,CareerError} from './career-service.mjs';
import {createDailyService} from './daily-service.mjs';
const app=express();app.use(express.json({limit:'2mb'}));
const careers=createCareerService({redis,validate:raw=>GameSession.migrateFromSave(raw)});
const daily=createDailyService({redis});
app.get('/api/daily',async(_req,res,next)=>{try{res.json(await daily.read(context.userId));}catch(error){next(error);}});
app.post('/api/daily',async(req,res,next)=>{try{res.json(await daily.act(context.userId,req.body));}catch(error){next(error);}});
app.get('/api/init',(_req,res)=>res.json({userId:context.userId??null,subredditId:context.subredditId??null}));
app.get('/api/career',async(_req,res,next)=>{try{res.json(await careers.read(context.userId));}catch(error){next(error);}});
app.put('/api/career',async(req,res,next)=>{try{res.json(await careers.write(context.userId,req.body));}catch(error){next(error);}});
app.delete('/api/career',async(req,res,next)=>{try{res.json(await careers.remove(context.userId,req.body));}catch(error){next(error);}});
app.post('/internal/menu/create-post',async(_req,res,next)=>{
  try{
    const post=await reddit.submitCustomPost({subredditName:context.subredditName,title:'ElevenFate · Tu carrera. Tus decisiones. Tu legado.',entry:'default'});
    res.json({navigateTo:post.url});
  }catch(error){next(error);}
});
app.use((error,_req,res,_next)=>{
  const status=error instanceof CareerError?error.status:error.type==='entity.too.large'?413:500;
  if(status===500)console.error('ElevenFate request failed:',error.name);
  res.status(status).json({error:status===500?'No se pudo completar la operación. Tu partida confirmada se conserva.':error.message});
});
createServer(app).listen(getServerPort());
