// Versioned server scoring. Never derive ranking points from client payloads.
const unit=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const percent=n=>unit(n/100);
const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
export function scoreSnapshot(state){
 return {role:state.sport.roleScore,technique:state.professional.technique,professionalism:state.personality.professionalism,control:state.control.career,fitness:state.body.fitness,risk:state.body.risk};
}
export function legacyDailyScore(state){
 const parts=[['Forma',state.sport.form,20],['Papel deportivo',state.sport.roleScore,20],['Estado físico',state.body.fitness,15],['Técnica',state.professional.technique,15],['Profesionalidad',state.personality.professionalism,15],['Control de carrera',state.control.career,15]];
 const breakdown=parts.map(([label,value,weight])=>({label,value:Math.max(0,Math.min(100,Number.isFinite(value)?value:0)),weight,points:Math.round(Math.max(0,Math.min(100,Number.isFinite(value)?value:0))*weight/10)}));
 return {total:Math.min(1000,breakdown.reduce((n,p)=>n+p.points,0)),breakdown};
}
export function careerDailyScore(state,run){
 const stages=(run.scoreStages??[]).slice(0,6);
 // Missing stages count as zero; each career stage has the same influence.
 const stageMean=fn=>stages.reduce((sum,s)=>sum+unit(fn(s)),0)/6;
 const matches=(run.competitions??[]).flatMap(c=>[...(c.player?.matches??[]),...(c.cupPlayer?.matches??[])]);
 const played=matches.filter(m=>m.player?.appeared);
 const participation=matches.length?played.length/matches.length:0;
 const rating=average(played.map(m=>unit((m.stats?.rating-4)/5)));
 const honours=new Map();
 for(const row of run.seasons??[]){
  // A collective trophy requires meaningful participation that season.
  if(row.played>=10)for(const title of row.titles??[]){const credit={'Campeón de liga':1,'Champions · formato adaptado':2}[title];if(credit)honours.set(`${row.season}:${row.club}:${title}`,credit);}
  if(row.played>=20)for(const award of row.awards??[])if(['Máximo goleador','Jugador de la temporada'].includes(award))honours.set(`${row.season}:${row.club}:${award}`,0.5);
 }
 const credits=[...honours.values()].reduce((a,b)=>a+b,0);
 const parts=[
  ['Rendimiento',rating*Math.sqrt(participation),35],
  ['Trayectoria',stageMean(s=>0.4*percent(s.role)+0.4*percent(s.technique)+0.2*percent(s.professionalism)),20],
  ['Logros',Math.sqrt(unit(credits/20)),15],
  ['Control de carrera',stageMean(s=>percent(s.control)),15],
  ['Continuidad y salud',0.5*participation+0.3*stageMean(s=>percent(s.fitness))+0.2*stageMean(s=>1-percent(s.risk)),10],
  ['Cierre de carrera',legacyDailyScore(state).total/1000,5],
 ];
 const breakdown=parts.map(([label,value,weight])=>({label,value:unit(value)*100,weight,points:Math.round(unit(value)*weight*10)}));
 return {version:2,total:breakdown.reduce((n,p)=>n+p.points,0),breakdown};
}
export function dailyScore(state,run){
 if(run?.finalScore)return run.finalScore;
 return run?.scoringVersion===2?careerDailyScore(state,run):legacyDailyScore(state);
}
