export function mountDaily({root,onClose}){
  let state=null,busy=false,mode='daily';
  const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  const button=(text,action)=>{const el=node('button',text);el.disabled=busy;el.addEventListener('click',action);return el;};
  async function request(body){
    busy=true;render();
    try{
      const response=await fetch(`/api/daily?mode=${mode}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify({...body,mode})}:{})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo abrir el Daily.');
      state=data;busy=false;render();
    }catch(error){busy=false;render();root.append(node('p',error.message),button('Recuperar intento',()=>request()));}
  }
  const act=command=>request({dailyId:state.config.id,action:'command',command:{...command,commandId:crypto.randomUUID(),expectedRevision:state.view.revision}});
  function render(){
    root.replaceChildren();root.append(button('← Volver a carrera',onClose),node('h1','ElevenFate Daily · prueba'));
    root.append(button(mode==='daily'?'Practicar sin entrar al ranking':'Volver al Daily de hoy',()=>{mode=mode==='daily'?'practice':'daily';state=null;request();}));
    if(mode==='practice')root.append(node('p','Modo práctica: intento separado, sin clasificación. Tu Daily sigue intacto.'));
    if(!state){root.append(node('p','Preparando el reto de hoy…'));return;}
    root.append(node('p',`${state.config.day} · cambia a las 00:00 UTC · ${state.resolved??0}/${state.config.decisions} decisiones`));
    if(!state.started){root.append(node('p','Empiezas con 18 años en UDV. Todos parten de la misma semilla. Construye tu futuro en 5 decisiones.'),node('p','Puntuación de prueba: forma 30%, papel deportivo 25%, estado físico 20%, profesionalidad 15% y control 10%. Máximo 1.000 puntos.'),button(mode==='practice'?'Empezar práctica':'Empezar Daily',()=>request({dailyId:state.config.id,action:'start'})));return;}
    const view=state.view;
    if(view.screen==='decision'){
      root.append(node('h2',view.decision.title),node('p',view.decision.body));
      for(const choice of view.decision.choices)root.append(button(choice.label,()=>act({type:'choose',pendingInstanceId:view.decision.instanceId,choiceId:choice.id})));
    }else if(view.screen==='result'){
      root.append(node('h2',view.result.title),node('p',view.result.choiceLabel));
      for(const message of view.result.messages)root.append(node('p',message));
      for(const effect of view.result.visibleEffects??[])root.append(node('p',`${effect.label}: ${effect.delta>0?'+':''}${new Intl.NumberFormat('es',{maximumFractionDigits:1}).format(effect.delta)}`));
      if(!state.finished)root.append(button('Siguiente decisión',()=>act({type:'acknowledge'})));
    }else if(view.screen==='offer'){
      root.append(node('h2','Oferta recibida'),node('p',`${view.offer.reason}. Salario propuesto: ${view.offer.terms.salaryMonthly} al mes.`));
      for(const action of ['accept','reject'])root.append(button(action==='accept'?'Aceptar':'Rechazar',()=>act({type:'offer',offerId:view.offer.id,action})));
    }
    if(state.finished){
      root.append(node('h2',`Resultado: ${state.score.total} / 1.000`),node('p',mode==='practice'?'Práctica completada. Puedes volver al Daily de hoy para jugar tu intento de clasificación.':'Has terminado el reto de hoy. Vuelve mañana para una semilla nueva.'));
      for(const part of state.score.breakdown)root.append(node('p',`${part.label}: ${part.points} puntos (${part.weight}%)`));
      if(mode==='daily')root.append(button(state.leaderboard?.position?'Actualizar mi resultado en el ranking':'Publicar mi puntuación en el ranking',()=>request({dailyId:state.config.id,action:'publish'})));
      root.append(node('p','Estamos probando la fórmula de puntuación.'));
    }
    if(mode==='daily'&&state.leaderboard){
      root.append(node('h2',`Ranking de hoy · ${state.leaderboard.total} participantes`));
      if(state.leaderboard.position)root.append(node('p',`Tu posición: ${state.leaderboard.position}`));
      for(const row of state.leaderboard.rows)root.append(node('p',`${row.position}. ${row.you?'Tú':'Jugador'} · ${row.score} puntos`));
      if(!state.leaderboard.total)root.append(node('p','Todavía no hay resultados publicados.'));
      root.append(node('p','Los empates se ordenan de forma estable. No se muestran nombres de cuenta.'));
    }
  }
  request();
}
