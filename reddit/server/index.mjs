import {createAnalyticsLimiter} from './analytics-limits.mjs';
import {createAnalyticsService} from './analytics-service.mjs';
import {createAnalyticsRouter} from './analytics-router.mjs';
import express from 'express';
import {createServer,getServerPort,context,redis,reddit} from '@devvit/web/server';
import {GameSession} from '../../dist/session/game-session.js';
import {createCareerService,CareerError} from './career-service.mjs';
import {createDailyService} from './daily-service.mjs';
import {createAccountData} from './account-data.mjs';
import {createGamePost} from './create-post.mjs';
const app=express();
const accounts=createAccountData({redis});
const analytics=createAnalyticsService({redis,accounts});
const isAnalyticsAdmin=async()=>{if(!context.userId)return false;try{const user=await reddit.getUserById(context.userId);return user?.username?.toLowerCase()==='accomplished-race114';}catch{return false;}};
app.use('/api/analytics',createAnalyticsRouter({service:analytics,accounts,identity:()=>context.userId,isAdmin:isAnalyticsAdmin,allowAttempt:createAnalyticsLimiter({redis})}));
app.use(express.json({limit:'2mb'}));
app.get('/api/init',async(_req,res,next)=>{try{res.json({userId:context.userId??null,subredditId:context.subredditId??null,session:context.userId?await accounts.open(context.userId):null});}catch(error){next(error);}});
app.use('/api',async(req,res,next)=>{
  try{
    const userId=context.userId,session=req.get('X-ElevenFate-Session');
    // Deletion retries remain idempotent after the session record is removed.
    if(!(req.method==='DELETE'&&req.path==='/account'))await accounts.assert(userId,session);
    req.gameRedis=accounts.guarded(userId,session);req.gameSession=session;next();
  }catch(error){next(error);}
});
app.get('/api/daily',async(req,res,next)=>{try{const result=await createDailyService({redis:req.gameRedis}).read(context.userId,req.query.mode??'daily',req.query.season);result.blockedUntil=await accounts.blockedUntil(context.userId);res.json(result);}catch(error){next(error);}});
app.post('/api/daily',async(req,res,next)=>{try{
  const blocked=await accounts.blockedUntil(context.userId);
  if((req.body.mode??'daily')==='daily'&&blocked)throw new CareerError(409,'Tras borrar tus datos, el Daily competitivo estará disponible a las 00:00 UTC. Puedes practicar.');
  res.json(await createDailyService({redis:req.gameRedis}).act(context.userId,req.body));
}catch(error){next(error);}});
const careerFor=req=>createCareerService({redis:req.gameRedis,validate:raw=>GameSession.migrateFromSave(raw)});
app.get('/api/career',async(req,res,next)=>{try{res.json(await careerFor(req).read(context.userId));}catch(error){next(error);}});
app.put('/api/career',async(req,res,next)=>{try{res.json(await careerFor(req).write(context.userId,req.body));}catch(error){next(error);}});
app.delete('/api/career',async(req,res,next)=>{try{res.json(await careerFor(req).remove(context.userId,req.body));}catch(error){next(error);}});
app.get('/api/account/export',async(req,res,next)=>{try{res.json(await accounts.exportData(context.userId,req.gameSession));}catch(error){next(error);}});
app.delete('/api/account',async(req,res,next)=>{try{res.json(await accounts.remove(context.userId,req.gameSession));}catch(error){next(error);}});
app.post('/internal/menu/create-post',async(_req,res,next)=>{
  try{
    const post=await createGamePost({context,reddit});
    res.json({navigateTo:post.url});
  }catch(error){next(error);}
});
app.use((error,_req,res,_next)=>{
  const status=error instanceof CareerError?error.status:error.type==='entity.too.large'?413:error.type==='entity.parse.failed'?400:error.status===415?415:500;
  if(status===500)console.error('ElevenFate request failed:',error.name);
  res.status(status).json({error:status===500?'No se pudo completar la operación. Tu partida confirmada se conserva.':error.message});
});
createServer(app).listen(getServerPort());
