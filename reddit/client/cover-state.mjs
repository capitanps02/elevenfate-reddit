// Presentation-only entry state. Reads never create or mutate a career.
export function createCoverState({readCareer,onChange=()=>{}}){
 let state={status:'checking',hasCareer:null,error:''},revision=0,disposed=false;
 const emit=()=>{if(!disposed)onChange({...state});};
 async function refresh(){
  const current=++revision;state={status:'checking',hasCareer:null,error:''};emit();
  try{
   const raw=await readCareer();
   if(disposed||current!==revision)return;
   if(raw!==null&&typeof raw!=='string')throw Error('Respuesta de guardado inválida.');
   state={status:'ready',hasCareer:raw!==null,error:''};
  }catch(error){
   if(disposed||current!==revision)return;
   state={status:'error',hasCareer:null,error:error?.message||'No se pudo comprobar la partida.'};
  }
  emit();
 }
 return {get:()=>({...state}),refresh,dispose(){disposed=true;revision++;}};
}
