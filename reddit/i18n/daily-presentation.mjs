const effect=/^(Técnica|Forma|Fatiga|Papel|Profesionalidad|Control|Físico|Riesgo|Calma|Prestigio) ([+-]?\d+(?:\.\d+)?)( máx\.)?$/;
export function dailyTradeoff(locale,source){
 if(!locale||locale.language==='es')return source;
 return source.split(' · ').map(part=>{
  const match=effect.exec(part);
  if(!match)return locale.text(part);
  const [,label,amount,maximum]=match;
  const number=locale.number(Number(amount),{maximumFractionDigits:10});
  return locale.text(label)+' '+(amount.startsWith('+')?'+':'')+number+(maximum?' '+locale.text('máx.'):'');
 }).join(' · ');
}
