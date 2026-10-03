export function mountDaily({root,onClose,assets={}}){
  let state=null,busy=false,mode='daily',screen='play',error='',selected=null;
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  const button=(text,action,cls='daily-button')=>{const el=node('button',text,cls);el.type='button';el.disabled=busy;el.addEventListener('click',action);return el;};
  function pending(){root.setAttribute('aria-busy',String(busy));for(const el of root.querySelectorAll('button'))el.disabled=busy;const status=root.querySelector('.daily-status');if(status)status.textContent=busy?'Guardando…':error||'';for(const choice of root.querySelectorAll('[data-choice]'))choice.classList.toggle('selected',busy&&choice.dataset.choice===selected);}
  async function request(body){
    busy=true;error='';if(!state)render();pending();const previous=state;
    try{const response=await fetch(`/api/daily?mode=${mode}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify({...body,mode})}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo abrir el reto.');state={...data,...(mode==='daily'&&!data.leaderboard&&previous?.leaderboard?{leaderboard:previous.leaderboard}:{})};}catch(e){error=e.message;}
    busy=false;selected=null;render();
  }
  const act=command=>{selected=command.choiceId??null;return request({dailyId:state.config.id,action:'command',command:{...command,commandId:crypto.randomUUID(),expectedRevision:state.view.revision}});};
  function switchMode(){mode=mode==='daily'?'practice':'daily';screen='play';state=null;request();}
  function render(){
    root.replaceChildren();root.dataset.screen=screen;
    const header=node('header',undefined,'daily-header');header.append(button('←',onClose,'daily-icon'),node('strong',mode==='practice'?'PRÁCTICA':'ELEVENFATE DAILY'),button('?',()=>{screen=screen==='rules'?'play':'rules';render();},'daily-icon'));header.firstChild.setAttribute('aria-label','Volver a carrera');header.lastChild.setAttribute('aria-label','Cómo jugar Daily');root.append(header);
    const progress=node('div',undefined,'daily-progress'),done=state?.resolved??0;for(let i=0;i<5;i++)progress.append(node('span',undefined,i<done?'complete':''));progress.setAttribute('aria-label',`${done} de 5 decisiones`);root.append(progress);
    const card=node('section',undefined,'daily-card'),actions=node('footer',undefined,'daily-actions');root.append(card,actions);
    if(screen==='rules'){
      card.append(node('span','CÓMO JUGAR','daily-kicker'),node('h1','Tu camino en 5 decisiones'),node('p','Lee la situación, elige y descubre qué cambia. Todos empiezan con las mismas condiciones.'),node('p','Forma 30% · papel deportivo 25% · físico 20% · profesionalidad 15% · control 10%.'),node('p','Un intento por cuenta y día. Cambia a las 00:00 UTC. La práctica no entra en el ranking. La puntuación aún está en pruebas.'));actions.append(button('Volver al reto',()=>{screen='play';render();},'daily-primary'),button(mode==='daily'?'Ir a práctica':'Volver al Daily',switchMode,'daily-link'));
    }else if(screen==='ranking'){
      card.append(node('span','CLASIFICACIÓN DE HOY','daily-kicker'),node('h1','¿Hasta dónde llegaste?'));const board=state?.leaderboard;
      if(!board?.total)card.append(node('p','Sé el primero en publicar tu resultado.'));else{if(board.position)card.append(node('p',`Tu posición: ${board.position}`));for(const row of board.rows){const line=node('div',undefined,'daily-rank');line.append(node('span',`${row.position}. ${row.you?'Tú':'Jugador'}`),node('strong',`${row.score} pts`));card.append(line);}}actions.append(button('Volver al reto',()=>{screen='play';render();},'daily-primary'));
    }else if(!state){card.append(node('span','UN NUEVO CAPÍTULO','daily-kicker'),node('h1','Preparando tu reto…'));
    }else if(!state.started){
      const portrait=node('img',undefined,'daily-portrait');portrait.src=assets.hero_player??'./cover.png';portrait.alt='';card.append(portrait,node('span','RETO DE HOY · 5 DECISIONES','daily-kicker'),node('h1','Tu primera oportunidad'),node('p','18 años. Valdoria. Un futuro por construir.'),node('div','Lee · Elige · Descubre','daily-prompt'));actions.append(button(mode==='practice'?'Empezar práctica':'Jugar el reto de hoy',()=>request({dailyId:state.config.id,action:'start'}),'daily-primary'),button(mode==='daily'?'Practicar primero':'Volver al Daily',switchMode,'daily-link'));
    }else if(state.finished){
      card.append(node('span',mode==='practice'?'PRÁCTICA COMPLETADA':'TU RESULTADO','daily-kicker'),node('h1',String(state.score.total),'daily-score'),node('p','puntos de 1.000','daily-score-label'),node('p',(state.view.result?.messages??['Cinco decisiones que construyen tu camino.']).join('\n')));const breakdown=node('div',undefined,'daily-breakdown');for(const part of state.score.breakdown){const row=node('div');row.append(node('span',part.label),node('strong',String(part.points)));breakdown.append(row);}card.append(breakdown);
      if(mode==='daily')actions.append(button(state.leaderboard?.position?'Resultado publicado ✓':'Publicar en el ranking',()=>request({dailyId:state.config.id,action:'publish'}),'daily-primary'),button('Ver clasificación',()=>{screen='ranking';render();},'daily-link'));else actions.append(button('Jugar el Daily',switchMode,'daily-primary'));
    }else{
      const view=state.view;card.append(node('span',view.screen==='result'?`DECISIÓN ${done} · CONSECUENCIAS`:`DECISIÓN ${done+1} DE 5`,'daily-kicker'));
      if(view.screen==='decision'){
        card.append(node('h1',view.decision.title),node('p',view.decision.body,'daily-story'));actions.dataset.choices=String(view.decision.choices.length);
        for(const [i,choice]of view.decision.choices.entries()){const el=button('',()=>act({type:'choose',pendingInstanceId:view.decision.instanceId,choiceId:choice.id}),'daily-choice');el.dataset.choice=choice.id;el.append(node('span',String.fromCharCode(65+i),'daily-letter'),node('span',choice.label));actions.append(el);}
      }else if(view.screen==='result'){
        card.append(node('h1',view.result.title));for(const message of view.result.messages)card.append(node('p',message,'daily-story'));const effects=node('div',undefined,'daily-effects');for(const effect of view.result.visibleEffects??[])effects.append(node('span',`${effect.label} ${effect.delta>0?'+':''}${new Intl.NumberFormat('es',{maximumFractionDigits:1}).format(effect.delta)}`));card.append(effects);actions.append(button('Siguiente decisión →',()=>act({type:'acknowledge'}),'daily-primary'));
      }else if(view.screen==='offer'){
        card.append(node('h1','Una oferta para ti'),node('p',view.offer.reason),node('p',`${view.offer.terms.salary} € al mes · ${view.offer.terms.months} meses`));for(const [action,label]of [['accept','Aceptar'],['reject','Rechazar']])actions.append(button(label,()=>act({type:'offer',offerId:view.offer.id,action}),'daily-choice'));
      }
    }
    if(error)actions.append(button('Recuperar intento',()=>request(),'daily-link'));const status=node('div',undefined,'daily-status');status.setAttribute('role','status');root.append(status);pending();root.scrollTop=0;const heading=card.querySelector('h1');if(heading&&!busy){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  request();
}
