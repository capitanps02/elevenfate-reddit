// Implements the existing UI's save-store contract. Local cache is never auto-uploaded.
export function createRedditSaveStore({request=fetch,validate,storage=null,cacheKey='elevenfate.reddit.confirmed.v1'}) {
  let record=null;
  const conflict=()=>Error('La carrera cambió en otro dispositivo. Recupera la partida actual antes de continuar.');
  async function api(method,body){
    let response;
    try{response=await request('/api/career',{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
    catch{throw Error('No se pudo confirmar el guardado en Reddit. Comprueba la conexión y recupera la partida actual.');}
    const data=await response.json();
    if(response.status===409)throw conflict();
    if(!response.ok)throw Error(data.error||'No se pudo acceder a tu carrera en Reddit.');
    return data;
  }
  function remember(next){record=next;try{storage?.setItem(cacheKey,JSON.stringify(next));}catch{}}
  async function refresh(){remember(await api('GET'));return record;}
  async function checked(raw){if(raw!==null)await validate(raw);return raw;}
  return {
    async read(){return checked((await refresh()).active);},
    async readRaw(){return (await refresh()).active;},
    async previous(){return checked((await refresh()).previous);},
    async write(snapshot,expected){
      const raw=JSON.stringify(snapshot);await validate(raw);
      if(!record)await refresh();
      if(record.active!==expected)throw conflict();
      remember(await api('PUT',{raw,expectedGeneration:record.generation}));
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
