import express from 'express';
import {CareerError} from './career-service.mjs';
export function createAnalyticsRouter({service,accounts,identity,isAdmin,allowAttempt=async()=>{}}){
 const router=express.Router();
 router.use(async(req,res,next)=>{try{res.set('Cache-Control','no-store');const id=identity();await accounts.assert(id,req.get('X-ElevenFate-Session'));req.analyticsUser=id;if(req.method==='POST'||req.method==='PUT')await allowAttempt(id);next();}catch(e){next(e);}});
 router.use(express.json({limit:'16kb',inflate:false,verify:(req,_res,buf)=>{req.analyticsBytes=buf.byteLength;}}));
 router.get('/preference',async(req,res,next)=>{try{res.json({...await service.preference(req.analyticsUser,req.get('X-ElevenFate-Session')),admin:await isAdmin()});}catch(e){next(e);}});
 router.put('/preference',async(req,res,next)=>{try{if(Object.keys(req.body??{}).join(',')!=='allowed')throw new CareerError(400,'Preferencia inválida.');res.json(await service.configure(req.analyticsUser,req.get('X-ElevenFate-Session'),req.body.allowed));}catch(e){next(e);}});
 router.post('/checkpoint',async(req,res,next)=>{try{res.json(await service.receive(req.analyticsUser,req.get('X-ElevenFate-Session'),req.body,req.analyticsBytes));}catch(e){next(e);}});
 router.post('/self-check',async(_req,res,next)=>{try{if(!await isAdmin())throw new CareerError(403,'Panel reservado al propietario.');res.json(await service.probe());}catch(e){next(e);}});
 router.get('/report',async(_req,res,next)=>{try{if(!await isAdmin())throw new CareerError(403,'Panel reservado al propietario.');const days=Number(_req.query.days??30);if(![7,30,60,90].includes(days))throw new CareerError(400,'Periodo inválido.');res.json(await service.report(days));}catch(e){next(e);}});
 return router;
}
