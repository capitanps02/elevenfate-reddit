// One segment, constant state, no listeners/timers/network. Integrate via explicit hooks.
export const ACTIVE_WINDOW_MS=120_000;
const MAX=Number.MAX_SAFE_INTEGER;
const no=()=>false;
const OFF=Object.freeze({enabled:false,startSegment:()=>null,action:no,setVisible:no,setPaused:no,setWaiting:no,checkpoint:()=>null,close:()=>null,disable:no});
export function createDurationMeter({mode='off',now=()=>performance.now()}={}) {
  if(mode!=='behavior')return OFF;
  let enabled=true,segment=0,open=false,visible=false,paused=false,waiting=false;
  let last=-1,cursor=0,deadline=0,active=0,shown=0,revision=0;
  function disable(){enabled=false;open=false;active=0;shown=0;deadline=0;return true;}
  function tick() {
    if(!enabled)return null;
    let t;try{t=now();}catch{disable();return null;}
    if(typeof t!=='number'||!Number.isFinite(t)||t<0||t>MAX||t<last){disable();return null;}
    last=t;
    if(open) {
      if(visible) {
        shown+=t-cursor;
        if(!paused&&!waiting)active+=Math.max(0,Math.min(t,deadline)-cursor);
      }
      cursor=t;
      if(active>MAX||shown>MAX){disable();return null;}
    }
    return t;
  }
  function summary(closed,partial) {
    if(revision===MAX){disable();return null;}
    return Object.freeze({segmentSeq:segment,counterRevision:++revision,activeMsTotal:active,visibleMsTotal:shown,closed,partial});
  }
  function flag(which,value) {
    if(typeof value!=='boolean'||tick()===null)return false;
    if(which===0)visible=value;else if(which===1)paused=value;else waiting=value;
    return true;
  }
  return Object.freeze({
    get enabled(){return enabled;},
    startSegment(id) {
      if(!enabled||!Number.isSafeInteger(id)||id<=segment)return null;
      const t=tick();if(t===null)return null;
      const previous=open?summary(true,false):null;if(!enabled)return null;
      segment=id;open=true;cursor=t;deadline=0;active=0;shown=0;revision=0;
      return previous;
    },
    action() {
      const t=tick();if(t===null||!open||!visible||paused||waiting)return false;
      deadline=Math.min(MAX,t+ACTIVE_WINDOW_MS);return true;
    },
    setVisible:value=>flag(0,value),setPaused:value=>flag(1,value),setWaiting:value=>flag(2,value),
    checkpoint() {if(tick()===null||!open)return null;return summary(false,true);},
    close(partial=true) {
      if(typeof partial!=='boolean'||tick()===null||!open)return null;
      const result=summary(true,partial);open=false;deadline=0;return result;
    },
    disable,
  });
}
