export function createAnalyticsPanel({request,preview=false,doc=document}){
 const dialog=doc.createElement('dialog');dialog.className='help-dialog analytics-panel';doc.body.append(dialog);
 const el=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text??'';return n;};
 const button=(label,fn)=>{const b=el('button',label);b.onclick=fn;return b;};
 const showExport=(data,label)=>{dialog.querySelector('[data-analytics-export]')?.remove();const section=el('section');section.dataset.analyticsExport='';section.append(el('h2',label),el('p','Selecciona el texto y cópialo para guardarlo. Reddit bloquea las descargas desde el marco del juego.'));const area=doc.createElement('textarea');area.readOnly=true;area.rows=12;area.value=data;area.setAttribute('aria-label',label);area.style.cssText='width:100%;box-sizing:border-box;background:#101014;color:#f5f5f5;padding:12px';section.append(area,button('Seleccionar todo',()=>{area.focus();area.select();}));dialog.append(section);area.focus();area.select();};
 async function open(days=30){
  dialog.replaceChildren(el('h1','ElevenFate · Datos del juego'),button('Cerrar',()=>dialog.close()));if(!dialog.open)dialog.showModal();
  if(preview)dialog.append(el('p','PRUEBA LOCAL · datos de prueba en memoria, no estadísticas reales de Reddit.'));
  const status=el('p','Cargando datos…');dialog.append(status,button('Verificar almacenamiento',async()=>{try{const res=await request('/api/analytics/self-check',{method:'POST'});if(!res.ok)throw Error('No se pudo verificar el almacenamiento.');const check=await res.json();status.textContent=check.passed?'Redis: lectura, persistencia y rechazo de escritura concurrente verificados.':'Redis: la comprobación no ha pasado. '+(check.stage??'')+' · '+(check.error??'');}catch(e){status.textContent=e.message;}}));
  try{const res=await request('/api/analytics/report?days='+days);if(!res.ok)throw Error(res.status===403?'Panel reservado al propietario.':'No se pudieron cargar los datos.');const r=await res.json();status.textContent=`Últimos ${days} días · UTC · ${r.generatedAt}`;
   const period=el('div');for(const d of [7,30,60,90])period.append(button(d+' días',()=>open(d)));dialog.append(period);
   if(!r.totals.sessions)dialog.append(el('p','Todavía no hay datos. Se mostrarán cuando participantes voluntarios jueguen en la versión con analítica activada.'));
   if(r.truncated)dialog.append(el('p','Muestra parcial: supera el límite de 1.000 participantes. No interpretes estas cifras como totales.'));
   const table=(headers,rows)=>{const t=el('table'),head=el('tr');headers.forEach(h=>head.append(el('th',h)));t.append(head);for(const row of rows){const tr=el('tr');row.forEach(v=>tr.append(el('td',String(v))));t.append(tr);}return t;};
   const t=r.totals,minute=n=>(n/60000).toFixed(1),pct=(n,d)=>d?(100*n/d).toFixed(1)+' %':'Sin muestra';
   dialog.append(table(['Indicador','Valor'],[['Participantes únicos',t.players],['Sesiones',t.sessions],['Minutos activos',minute(t.activeMs)],['Minutos visibles',minute(t.visibleMs)],['Mediana sesión activa',r.sessionActiveMinutes.median?.toFixed(1)??'Sin muestra'],['P90 sesión activa',r.sessionActiveMinutes.p90?.toFixed(1)??'Sin muestra'],['Fallos de guardado / intentos',pct(t.events.save_error,t.events.save_attempt)]]));
   dialog.append(el('h2','Regreso por cohortes'),table(['Día','Regresan','Elegibles','Tasa'],Object.entries(r.retention).map(([d,v])=>['D'+d,v.returned,v.eligible,pct(v.returned,v.eligible)])));
   dialog.append(el('h2','Uso de pantallas'),table(['Pantalla','Minutos activos'],Object.entries(t.screens).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,minute(v)])));
   dialog.append(el('h2','Progreso y errores'),table(['Evento','Veces'],Object.entries(t.events).filter(([,v])=>v>0)),el('h2','Días'),table(['Fecha','Participantes','Sesiones','Min. activos'],r.daily.map(d=>[d.date,d.players,d.sessions,minute(d.activeMs)])));
   dialog.append(el('h2','Última pantalla recibida'),table(['Pantalla','Sesiones'],Object.entries(r.lastScreens)),el('p',`Cierres observados: ${r.closes.observed}. Sesiones con cierre incompleto: ${r.closes.partial}. La última pantalla no prueba abandono.`),el('h2','Dispositivo e idioma'),table(['Grupo','Sesiones'],[...Object.entries(r.devices),...Object.entries(r.languages)]),el('h2','Latencia de lecturas y guardados confirmados'),table(['Tiempo','Solicitudes'],['≤100 ms','100–300 ms','300–1000 ms','1–3 s','3–10 s','10–60 s','>60 s'].map((label,i)=>[label,t.latency[i]])));
   if(t.events.save_attempt>=30&&t.events.save_error/t.events.save_attempt>=.05)dialog.append(el('p','Señal de mejora: al menos el 5 % de los intentos de guardado fallan. Revisa conexión, conflictos y recuperación.'));
   dialog.append(el('h2','Cómo interpretar los resultados'));r.limitations.forEach(l=>dialog.append(el('p',l)));
   dialog.append(button('Ver JSON para copiar',()=>showExport(JSON.stringify(r,null,2),'Informe JSON')),button('Ver CSV para copiar',()=>showExport('fecha,participantes,sesiones,minutos_activos,minutos_visibles\n'+r.daily.map(d=>[d.date,d.players,d.sessions,minute(d.activeMs),minute(d.visibleMs)].join(',')).join('\n'),'Resumen CSV')));
  }catch(e){status.textContent=e.message;}
 }
 return {open};
}
