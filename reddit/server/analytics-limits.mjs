import {CareerError} from './career-service.mjs';
// Count attempts before JSON parsing. Counters expire and contain no event data.
export function createAnalyticsLimiter({redis,now=Date.now}){
 return async id=>{
  const minute=Math.floor(now()/60000),userKey=`analytics:v2:rate:${id}:${minute}`,globalKey=`analytics:v2:rate:installation:${minute}`;
  const n=await redis.incrBy(userKey,1);await redis.expire(userKey,120);
  if(n>12)throw new CareerError(429,'Demasiadas peticiones analíticas.');
  const total=await redis.incrBy(globalKey,1);await redis.expire(globalKey,120);
  if(total>3000)throw new CareerError(429,'Límite temporal de la instalación.');
 };
}
