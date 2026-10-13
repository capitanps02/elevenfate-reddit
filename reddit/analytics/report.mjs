import {EVENTS,SCREENS} from './contract.mjs';
export function summarize(records,{now=Date.now(),days=30,truncated=false}={}){
 const today=new Date(now).toISOString().slice(0,10),cutoff=new Date(now-(days-1)*86400000).toISOString().slice(0,10);
 const totals={players:0,sessions:0,activeMs:0,visibleMs:0,events:Object.fromEntries(EVENTS.map(k=>[k,0])),screens:Object.fromEntries(SCREENS.map(k=>[k,0])),latency:Array(7).fill(0)},daily={},devices={},languages={},sessionMinutes=[];
 const lastScreens={},closes={observed:0,partial:0};
 const retention={};for(const n of [1,7,30])retention[n]={eligible:0,returned:0,rate:null};
 for(const r of records){
  if(!r.allowed)continue;
  let included=false;
  for(const [day,d] of Object.entries(r.days??{})){
   if(day<cutoff||day>today)continue;included=true;
   const row=daily[day]??={date:day,players:0,sessions:0,activeMs:0,visibleMs:0};row.players++;
   row.sessions+=Object.keys(d.sessions).length;totals.sessions+=Object.keys(d.sessions).length;
   for(const s of Object.values(d.sessions)){
    lastScreens[s.lastScreen]=(lastScreens[s.lastScreen]??0)+1;closes[s.closed?'observed':'partial']++;
    row.activeMs+=s.activeMs;row.visibleMs+=s.visibleMs;totals.activeMs+=s.activeMs;totals.visibleMs+=s.visibleMs;sessionMinutes.push(s.activeMs/60000);
    for(const k of EVENTS)totals.events[k]+=s.events[k];for(const k of SCREENS)totals.screens[k]+=s.screens[k]??0;
    s.latency.forEach((v,i)=>totals.latency[i]+=v);devices[s.device]=(devices[s.device]??0)+1;languages[s.language]=(languages[s.language]??0)+1;
   }
  }
  if(included)totals.players++;
  const first=r.firstSeen;if(!first)continue;
  for(const n of [1,7,30]){const target=new Date(Date.parse(first+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);if(target>=cutoff&&target<=today){retention[n].eligible++;if(r.days[target])retention[n].returned++;}}
 }
 for(const v of Object.values(retention))v.rate=v.eligible?v.returned/v.eligible:null;
 sessionMinutes.sort((a,b)=>a-b);const p=q=>sessionMinutes.length?sessionMinutes[Math.ceil(q*sessionMinutes.length)-1]:null;
 return {schema:2,generatedAt:new Date(now).toISOString(),timezone:'UTC',days,truncated,totals,daily:Object.values(daily).sort((a,b)=>a.date.localeCompare(b.date)),retention,devices,languages,lastScreens,closes,sessionActiveMinutes:{median:p(.5),p90:p(.9)},limitations:['Solo participantes voluntarios; no equivale a toda la audiencia.','Una sesión es una apertura del juego; el último checkpoint limita la precisión del cierre.','Tiempo activo: pestaña visible, sin pausa ni espera y hasta 120 s desde la última interacción.','Cohortes cuyo día de regreso cae en el periodo seleccionado. Retención exacta por día UTC; D30 requiere cohortes con 30 días de antigüedad.','No se infiere el motivo del abandono a partir de una pantalla.']};
}
