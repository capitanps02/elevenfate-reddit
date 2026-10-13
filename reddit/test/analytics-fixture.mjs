// Atomic transaction double with full watched-key conflict checks; never production Redis evidence.
export function analyticsRedis(){
 const values=new Map(),sorted=new Map(),versions=new Map();let fail=false,hook=null;
 const bump=k=>versions.set(k,(versions.get(k)??0)+1);
 const api={get:async k=>values.get(k),set:async(k,v)=>{values.set(k,v);bump(k);return 'OK';},del:async(...keys)=>{for(const k of keys){values.delete(k);bump(k);}return keys.length;},zScore:async(k,m)=>sorted.get(k)?.get(m),zCard:async k=>sorted.get(k)?.size??0,
 zAdd:async(k,...rows)=>{const m=sorted.get(k)??new Map();for(const row of rows)m.set(row.member,row.score);sorted.set(k,m);bump(k);return rows.length;},zRem:async(k,rows)=>{for(const row of rows)sorted.get(k)?.delete(row);bump(k);return rows.length;},zRemRangeByScore:async(k,min,max)=>{for(const [m,s] of sorted.get(k)??[])if(s>=min&&s<=max)sorted.get(k).delete(m);bump(k);return 0;},
 zRange:async(k,min,max,options)=>[...(sorted.get(k)??[])].filter(([,s])=>s>=min&&s<=max).map(([member,score])=>({member,score})).sort((a,b)=>a.score-b.score).slice(options?.limit?.offset??0,(options?.limit?.offset??0)+(options?.limit?.count??1000)),
 watch:async(...keys)=>{const seen=keys.map(k=>versions.get(k)??0),ops=[];const tx={multi:async()=>{},discard:async()=>{},exec:async()=>{if(hook){const h=hook;hook=null;await h();}if(fail){fail=false;throw Error('Redis down');}if(keys.some((k,i)=>(versions.get(k)??0)!==seen[i]))return [];const result=[];for(const [name,args] of ops)result.push(await api[name](...args));return result;}};for(const name of ['set','del','zAdd','zRem','zRemRangeByScore'])tx[name]=async(...args)=>{ops.push([name,args]);return tx;};return tx;},
 fail:()=>fail=true,before:fn=>hook=fn,values,sorted};return api;
}
