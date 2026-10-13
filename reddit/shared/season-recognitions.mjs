import {leagueRivals} from './league-simulator.mjs';

// Recognition policy v1. Major league prizes remain in seasonHonours unchanged.
// At most one smaller recognition per closed season, with a factual explanation.
export function seasonRecognitions(season,majorAwards=[]){
  if(!season.closed||majorAwards.length)return [];
  const p=season.player,appearances=p.matches.filter(m=>m.player.appeared&&Number.isFinite(m.stats.rating));
  const minutes=appearances.reduce((n,m)=>n+m.player.minutes,0);
  if(!minutes)return [];
  const average=appearances.reduce((n,m)=>n+m.stats.rating*m.player.minutes,0)/minutes;
  const rating=average.toFixed(2),recognition=(id,title,reason)=>[{id,title,reason}];
  const clubRivals=leagueRivals(season).filter(r=>r.club===season.clubId&&r.played>=20&&r.minutes>=900);
  if(appearances.length>=20&&minutes>=1200&&average>=6.8&&clubRivals.filter(r=>r.rating>average).length<=2){
    return recognition('club_standout','Jugador destacado del club',`${rating} de nota media en ${minutes} minutos; entre las tres mejores valoraciones de tu plantilla con participación suficiente.`);
  }
  let chain=0,longest=0;
  for(const match of appearances){chain=match.stats.rating>=7&&match.player.minutes>=30?chain+1:0;longest=Math.max(longest,chain);}
  if(longest>=5)return recognition('good_run','Racha de buenas actuaciones',`${longest} apariciones consecutivas de al menos 30 minutos con una nota de al menos 7,0.`);
  if(appearances.length>=20&&minutes>=1500&&average>=6.5){
    return recognition('reliable_season','Regularidad de temporada',`${appearances.length} partidos, ${minutes} minutos y ${rating} de nota media; mínimo de 20 partidos, 1.500 minutos y 6,50.`);
  }
  const subs=appearances.filter(m=>!m.player.started),subMinutes=subs.reduce((n,m)=>n+m.player.minutes,0);
  const subRating=subMinutes?subs.reduce((n,m)=>n+m.stats.rating*m.player.minutes,0)/subMinutes:0;
  if(subs.length>=10&&subMinutes>=250&&subRating>=6.5&&subs.filter(m=>m.stats.rating>=7&&m.player.minutes>=15).length>=2){
    return recognition('useful_substitute','Aportación desde el banquillo',`${subs.length} entradas, ${subMinutes} minutos y ${subRating.toFixed(2)} de nota media como suplente, con al menos dos actuaciones de 15 minutos y nota de 7,0.`);
  }
  return [];
}
