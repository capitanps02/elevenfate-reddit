export const SCREENS=['home','career','world','relations','profile','save','decision','result','offer','epilogue','player_action_menu','player_action_category','player_action_detail','player_action_result','daily','practice','ranking','rules','help'];
export const EVENTS=['command_ok','command_error','save_attempt','save_ok','save_error','load_ok','load_error','daily_start','daily_complete','practice_start','practice_complete','daily_choice','practice_choice','client_error','career_start','career_choice','career_complete','player_action',...['daily','practice'].flatMap(m=>Array.from({length:6},(_,i)=>m+'_stage_'+(i+1)))];
export const BUCKETS=[100,300,1000,3000,10000,60000];
export const emptyCounters=()=>Object.fromEntries(EVENTS.map(k=>[k,0]));
export function validSnapshot(v){
 const keys=['schema','day','generation','session','revision','activeMs','visibleMs','screens','events','latency','device','language','closed','lastScreen'];
 const number=n=>Number.isSafeInteger(n)&&n>=0&&n<=86400000;
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!object(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v.day)||v.schema!==2||!Number.isSafeInteger(v.generation)||v.generation<1||!/^[-a-zA-Z0-9]{16,64}$/.test(v.session)||!Number.isSafeInteger(v.revision)||v.revision<1||!number(v.activeMs)||!number(v.visibleMs)||v.activeMs>v.visibleMs||!SCREENS.includes(v.lastScreen)||typeof v.closed!=='boolean'||!['mobile','desktop'].includes(v.device)||!['es','en'].includes(v.language))return false;
 if(!object(v.screens)||Object.keys(v.screens).some(k=>!SCREENS.includes(k)||!number(v.screens[k])))return false;
 if(Object.values(v.screens).reduce((a,b)=>a+b,0)!==v.activeMs)return false;
 if(!object(v.events)||Object.keys(v.events).length!==EVENTS.length||EVENTS.some(k=>!number(v.events[k])))return false;
 return Array.isArray(v.latency)&&v.latency.length===7&&v.latency.every(number);
}
