export function mountDaily({root,onClose}){
  let state=null,busy=false;
  const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  const button=(text,action)=>{const el=node('button',text);el.disabled=busy;el.addEventListener('click',action);return el;};
  async function request(body){
    busy=true;render();
    try{
      const response=await fetch('/api/daily',{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo abrir el Daily.');
      state=data;busy=false;render();
    }catch(error){busy=false;render();root.append(node('p',error.message),button('Recuperar intento',()=>request()));}
  }
  const act=command=>request({dailyId:state.config.id,action:'command',command:{...command,commandId:crypto.randomUUID(),expectedRevision:state.view.revision}});
  function render(){
    root.replaceChildren();root.append(button('← Volver a carrera',onClose),node('h1','ElevenFate Daily · prueba'));
    if(!state){root.append(node('p','Preparando el reto de hoy…'));return;}
    root.append(node('p',`${state.config.day} · cambia a las 00:00 UTC · ${state.resolved??0}/${state.config.decisions} decisiones`));
    if(!state.started){root.append(node('p','Empiezas con 18 años en UDV. Todos parten de la misma semilla. Construye tu futuro en 5 decisiones.'),node('p','Puntuación de prueba: forma 30%, papel deportivo 25%, estado físico 20%, profesionalidad 15% y control 10%. Máximo 1.000 puntos.'),button('Empezar Daily',()=>request({dailyId:state.config.id,action:'start'})));return;}
    const view=state.view;
    if(view.screen==='decision'){
      root.append(node('h2',view.decision.title),node('p',view.decision.body));
      for(const choice of view.decision.choices)root.append(button(choice.label,()=>act({type:'choose',pendingInstanceId:view.decision.instanceId,choiceId:choice.id})));
    }else if(view.screen==='result'){
      root.append(node('h2',view.result.title),node('p',view.result.choiceLabel));
      for(const message of view.result.messages)root.append(node('p',message));
      for(const effect of view.result.visibleEffects??[])root.append(node('p',`${effect.label}: ${effect.delta>0?'+':''}${effect.delta}`));
      if(!state.finished)root.append(button('Siguiente decisión',()=>act({type:'acknowledge'})));
    }else if(view.screen==='offer'){
      root.append(node('h2','Oferta recibida'),node('p',`${view.offer.reason}. Salario propuesto: ${view.offer.terms.salaryMonthly} al mes.`));
      for(const action of ['accept','reject'])root.append(button(action==='accept'?'Aceptar':'Rechazar',()=>act({type:'offer',offerId:view.offer.id,action})));
    }
    if(state.finished){
      root.append(node('h2',`Resultado: ${state.score.total} / 1.000`),node('p','Has terminado el reto de hoy. Vuelve mañana para una semilla nueva.'));
      for(const part of state.score.breakdown)root.append(node('p',`${part.label}: ${part.points} puntos (${part.weight}%)`));
      root.append(node('p','Estamos probando la fórmula. El ranking todavía no está activado.'));
    }
  }
  request();
}
