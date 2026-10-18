import {createDurationMeter} from '../telemetry/duration.mjs';
import {SCREENS,EVENTS,BUCKETS,emptyCounters} from '../analytics/contract.mjs';
// No narrative, player names, saves, URLs or error text enters this collector.
export function createAnalytics({request=fetch,doc=document,win=window,now=()=>performance.now(),wall=Date.now,uuid=()=>crypto.randomUUID()}={}){
 let allowed=false,admin=false,waiting=false,generation=0,meter=null,screen='home',lastActive=0,session='',revision=0,events=emptyCounters(),screens={},latency=Array(7).fill(0),sending=false,timer=null,abort=null,pending=null,closed=false,currentDay='',failures=0,blockedUntil=0;
 const utc=()=>new Date(wall()).toISOString().slice(0,10);
 const account=()=>{if(!meter)return;const c=meter.checkpoint();if(c){screens[screen]=(screens[screen]??0)+c.activeMsTotal-lastActive;lastActive=c.activeMsTotal;}};
 function reset(){meter?.disable();meter=createDurationMeter({mode:'behavior',now:()=>Math.floor(now())});meter.startSegment(1);meter.setVisible(!doc.hidden);session=uuid();currentDay=utc();revision=0;events=emptyCounters();screens={};latency=Array(7).fill(0);lastActive=0;pending=null;closed=false;}
 function rollover(){if(currentDay!==utc())reset();}
 function stop(){allowed=false;meter?.disable();meter=null;pending=null;abort?.abort();clearTimeout(timer);timer=null;}
 function observe(kind,a,b){try{if(!allowed)return;rollover();account();if(kind==='screen'&&SCREENS.includes(a))screen=a;
  else if(kind==='action')meter.action();else if(kind==='waiting'){waiting=Boolean(a);meter.setWaiting(waiting);}else if(kind==='paused')meter.setPaused(Boolean(a));else if(kind==='event'&&EVENTS.includes(a)){events[a]++;if(typeof b==='number'&&b>=0)latency[Math.min(6,BUCKETS.findIndex(x=>b<=x)===-1?6:BUCKETS.findIndex(x=>b<=x))]++;}
 }catch{stop();}}
 function snapshot(){rollover();account();const c=meter.checkpoint();if(!c)return null;return {schema:2,day:currentDay,generation,session,revision:++revision,activeMs:c.activeMsTotal,visibleMs:c.visibleMsTotal,screens:{...screens},events:{...events},latency:[...latency],device:win.matchMedia?.('(max-width: 700px)').matches?'mobile':'desktop',lastScreen:screen,language:doc.documentElement.lang==='en'?'en':'es',closed};}
 async function flush(){
  if(!allowed||sending||wall()<blockedUntil||(waiting&&!doc.hidden))return;
  pending??=snapshot();if(!pending)return;const body=JSON.stringify(pending);if(body.length>16384){stop();return;}
  sending=true;abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),3000);
  try{const res=await request('/api/analytics/checkpoint',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:abort.signal,keepalive:true});
   if([401,403].includes(res.status))stop();else if(res.ok){pending=null;failures=0;}else if([400,409].includes(res.status))pending=null;else if(res.status===429)blockedUntil=wall()+3600000;else throw Error('retry');
  }catch{if(++failures>=3){blockedUntil=wall()+600000;failures=0;}}finally{clearTimeout(timeout);sending=false;abort=null;}
 }
 function schedule(){clearTimeout(timer);if(allowed&&!doc.hidden)timer=setTimeout(()=>{void flush().finally(schedule);},60000);}
 const visibility=()=>{if(allowed){rollover();account();meter.setVisible(!doc.hidden);if(doc.hidden){clearTimeout(timer);timer=null;void flush();}else schedule();}};
 const leaving=()=>{if(allowed){account();closed=true;meter.setVisible(false);void flush();}};
 const interaction=event=>{if(event.isTrusted)observe('action');};
 doc.addEventListener('visibilitychange',visibility);doc.addEventListener('pointerdown',interaction,{passive:true});doc.addEventListener('keydown',interaction,{passive:true});win.addEventListener('pagehide',leaving);win.addEventListener('pageshow',()=>{if(allowed){closed=false;meter.setVisible(!doc.hidden);}});win.addEventListener('error',()=>observe('event','client_error'));win.addEventListener('unhandledrejection',()=>observe('event','client_error'));
 async function configure(value){if(!value)stop();const res=await request('/api/analytics/preference',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({allowed:value})});if(!res.ok)throw Error('No se pudo cambiar la preferencia.');const state=await res.json();stop();generation=state.generation;allowed=state.allowed;if(allowed){reset();schedule();}return allowed;}
 const ready=(async()=>{try{const res=await request('/api/analytics/preference');if(res.ok){const state=await res.json();allowed=state.allowed;admin=state.admin===true;generation=state.generation;if(allowed){reset();schedule();}}}catch{stop();}})();
 return {observe,flush,configure,ready,stop,get allowed(){return allowed;},get admin(){return admin;},get screen(){return screen;}};
}
