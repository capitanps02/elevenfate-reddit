// Factory only. Mount before the application's global JSON parser when certified.
import {MAX_WIRE_BYTES} from './diagnostic-wire.mjs';
const subjectToken=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(x);
export function createDiagnosticRouter(options={}) {
  // OFF requires no Express, identity, quota or storage dependencies.
  if(options.enabled!==true)return (_req,res)=>res.status(403).set('Cache-Control','no-store').json({result:'disabled'});
  const {express,context,subjectFor,admitAttempt,store}=options;
  const router=express.Router();
  const parse=express.raw({type:'application/json',limit:MAX_WIRE_BYTES,inflate:false});
  router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.post('/diagnostic',async(req,res,next)=>{
    try {
      const userId=context().userId;
      if(typeof userId!=='string'||!/^t2_[a-z0-9]+$/.test(userId))return res.status(401).json({result:'unauthenticated'});
      // Required external gate bounds attempts/install load before body parsing.
      const gate=await admitAttempt(userId);
      if(gate?.allowed!==true){
        const retry=gate?.retryAfterSeconds;
        if(Number.isSafeInteger(retry)&&retry>=1&&retry<=3600)res.set('Retry-After',String(retry));
        return res.status(429).json({result:'quota'});
      }
      const subject=await subjectFor(userId);
      if(!subjectToken(subject))return res.status(503).json({result:'retry'});
      res.locals.telemetrySubject=subject;next();
    }catch{res.status(503).json({result:'retry'});}
  },(req,res,next)=>{
    if(!req.is('application/json'))return res.status(415).json({result:'media'});
    // Bytes, not parsed objects. No decompression or permissive body fallback.
    parse(req,res,next);
  },async(req,res)=>{
    try {
      if(!Buffer.isBuffer(req.body))return res.status(400).json({result:'invalid'});
      let wire;
      try{wire=new TextDecoder('utf-8',{fatal:true}).decode(req.body);}
      catch{return res.status(400).json({result:'invalid'});}
      const result=await store.receive(res.locals.telemetrySubject,wire);
      if(!result||![200,400,403,409,413,429,503].includes(result.status)||typeof result.result!=='string'||! /^[a-z_-]{1,40}$/.test(result.result))throw Error('response');
      const body={result:result.result};
      if(result.status===200){if(!subjectToken(result.batchId))throw Error('receipt');body.batchId=result.batchId;}
      res.status(result.status).json(body);
    }catch{res.status(503).json({result:'retry'});}
  });
  router.use((error,_req,res,_next)=>res.status(error.type==='entity.too.large'?413:error.type==='encoding.unsupported'?415:400).json({result:'invalid'}));
  return router;
}
