export async function requestJSON(url,options={}, {fetcher=fetch,timeoutMs=20000,decode=response=>response.json()}={}){
 const controller=new AbortController();let timer;
 try{return await Promise.race([
  (async()=>{const response=await fetcher(url,{...options,signal:controller.signal});return {response,data:await decode(response)};})(),
  new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('La conexión tardó demasiado. La acción puede haberse guardado; recupera la partida antes de repetirla.'));},timeoutMs);})
 ]);}finally{clearTimeout(timer);}
}
