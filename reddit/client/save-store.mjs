// Implements the existing UI's save-store contract. Local cache is never auto-uploaded.
export function createRedditSaveStore({request=fetch,validate,storage=null,cacheKey='elevenfate.reddit.confirmed.v1',timeoutMs=8000,retryDelay=()=>new Promise(resolve=>setTimeout(resolve,200+Math.floor(Math.random()*200)))}) {
  let record=null;
  const uncertain=()=>Object.assign(Error('No se pudo confirmar el guardado en Reddit. Comprueba la conexión y recupera la partida actual.'),{transient:true});
  const conflict=()=>Error('La carrera cambió en otro dispositivo. Recupera la partida actual antes de continuar.');
  async function api(method,body){
    const controller=new AbortController();let timer,httpStatus;
    const operation=(async()=>{
      let response;
      try{response=await request('/api/career',{method,signal:controller.signal,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
      catch{throw uncertain();}
      httpStatus=response.status;
      // Classify HTTP status even when the error body is truncated or not JSON.
      if(response.status===409)throw conflict();
      if(!response.ok){
        const transient=[408,429,500,502,503,504].includes(response.status);
        let data;try{data=await response.json();}catch{}
        throw Object.assign(Error(data?.error||'No se pudo acceder a tu carrera en Reddit.'),{transient,status:response.status});
      }
      let data;try{data=await response.json();}catch{throw uncertain();}
      if(data?.version!==1||!Number.isSafeInteger(data.generation)||data.generation<0||!(data.active===null||typeof data.active==='string')||!(data.previous===null||typeof data.previous==='string'))throw uncertain();
      return data;
    })();
    // Also bounds body reads and request adapters that fail to honor AbortSignal.
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();const error=uncertain();if(httpStatus>=400&&! [408,429,500,502,503,504].includes(httpStatus)){error.transient=false;error.status=httpStatus;}reject(error);},timeoutMs);});
    try{return await Promise.race([operation,deadline]);}finally{clearTimeout(timer);}
  }
  function remember(next){record=next;try{storage?.setItem(cacheKey,JSON.stringify(next));}catch{}}
  async function refresh(){remember(await api('GET'));return record;}
  async function checked(raw){if(raw!==null)await validate(raw);return raw;}
  return {
    async read(){return checked((await refresh()).active);},
    async readRaw(){return (await refresh()).active;},
    async previous(){return checked((await refresh()).previous);},
    async write(snapshot,expected,{recover=true}={}){
      const raw=JSON.stringify(snapshot);await validate(raw);
      if(!record)await refresh();
      if(record.active!==expected)throw conflict();
      const before=record,body={raw,expectedGeneration:before.generation};
      // Reuse the frozen candidate; never dispatch a decision or recalculate RNG.
      for(let attempt=0;attempt<2;attempt++){
        try{
          const next=await api('PUT',body);
          if(next.active!==raw||next.generation<before.generation)throw uncertain();
          remember(next);return;
        }catch(error){
          if(!recover||!error.transient)throw error;
          const current=await api('GET');
          if(current.active===raw&&current.generation>=before.generation){remember(current);return;}
          if(current.generation!==before.generation||current.active!==before.active)throw conflict();
          if(attempt===1)throw error;
          await retryDelay();
        }
      }
    },
    async remove(){
      if(!record)await refresh();
      record=await api('DELETE',{expectedGeneration:record.generation});
      try{storage?.removeItem(cacheKey);}catch{}
    },
    hasPrevious:()=>!!record?.previous,
    legacyChanged:async()=>false,
    legacyRaw:()=>null,
    close:async()=>{},
  };
}
