export class CareerError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
const empty=()=>({version:1,generation:0,active:null,previous:null});
const size=raw=>new TextEncoder().encode(raw).byteLength;
const keyFor=userId=>{
  if(typeof userId!=='string'||!/^t2_[a-z0-9]+$/i.test(userId))throw new CareerError(401,'Inicia sesión en Reddit para guardar y continuar tu carrera.');
  return `career:v1:${userId}`;
};
function decode(raw){
  if(!raw)return empty();
  const value=JSON.parse(raw);
  if(value.version!==1||!Number.isSafeInteger(value.generation)||value.generation<0||!(value.active===null||typeof value.active==='string')||!(value.previous===null||typeof value.previous==='string'))throw new CareerError(500,'No se pudo leer la partida. La copia guardada se conserva.');
  return value;
}
export function createCareerService({redis,validate,maxSaveBytes=1_500_000}){
  return {
    async read(userId){return decode(await redis.get(keyFor(userId)));},
    async remove(userId,{expectedGeneration}={}){
      const key=keyFor(userId);
      if(!Number.isSafeInteger(expectedGeneration)||expectedGeneration<0)throw new CareerError(400,'Revisión de guardado inválida.');
      const txn=await redis.watch(key);let finished=false;
      try{
        const current=decode(await redis.get(key));
        if(current.generation!==expectedGeneration)throw new CareerError(409,'La carrera cambió en otro dispositivo. Recupera la partida actual.');
        // Retain the generation only so stale clients cannot resurrect a deleted career.
        const next={version:1,generation:current.generation+1,active:null,previous:null};
        await txn.multi();await txn.set(key,JSON.stringify(next));const result=await txn.exec();finished=true;
        if(!Array.isArray(result)||result.length!==1||result[0]===null)throw new CareerError(409,'La carrera cambió durante la eliminación.');
        return next;
      }finally{if(!finished)await txn.discard();}
    },
    async write(userId,{raw,expectedGeneration}={}){
      const key=keyFor(userId);
      if(typeof raw!=='string'||size(raw)>maxSaveBytes)throw new CareerError(413,'La partida supera el tamaño admitido. Conserva una exportación antes de continuar.');
      if(!Number.isSafeInteger(expectedGeneration)||expectedGeneration<0)throw new CareerError(400,'Revisión de guardado inválida.');
      try{await validate(raw);}catch{throw new CareerError(400,'La copia no es una partida compatible de ElevenFate.');}
      const txn=await redis.watch(key);
      let finished=false;
      try{
        // Devvit TxClient.get queues a command and returns the transaction itself.
        // Read through redis after WATCH; concurrent changes still abort EXEC.
        const current=decode(await redis.get(key));
        // A response may have been lost after commit: replaying identical bytes is safe.
        if(current.active===raw){await txn.discard();finished=true;return current;}
        if(current.generation!==expectedGeneration)throw new CareerError(409,'La carrera cambió en otro dispositivo. Recupera la partida actual.');
        const next={version:1,generation:current.generation+1,active:raw,previous:current.active??current.previous};
        await txn.multi();await txn.set(key,JSON.stringify(next));
        const result=await txn.exec();finished=true;
        if(!Array.isArray(result)||result.length!==1||result[0]===null)throw new CareerError(409,'La carrera cambió durante el guardado. Recupera la partida actual.');
        return next;
      }finally{if(!finished)await txn.discard();}
    },
  };
}
