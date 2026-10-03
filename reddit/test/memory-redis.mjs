// Test/preview dependency only. Models WATCH -> read -> MULTI -> EXEC conflicts.
export function createMemoryRedis(){
  const values=new Map(),versions=new Map(),sorted=new Map();
  const api={
    async get(key){return values.get(key);},
    async set(key,value){values.set(key,value);versions.set(key,(versions.get(key)||0)+1);},
    async expire(){},
    async zAdd(key,...members){const entries=sorted.get(key)??new Map();let added=0;for(const {member,score} of members){if(!entries.has(member))added++;entries.set(member,score);}sorted.set(key,entries);return added;},
    async zRange(key,start,stop,{reverse=false}={}){const rows=[...(sorted.get(key)??new Map())].map(([member,score])=>({member,score})).sort((a,b)=>a.score-b.score||(a.member<b.member?-1:a.member>b.member?1:0));if(reverse)rows.reverse();return rows.slice(start,stop+1);},
    async zCard(key){return sorted.get(key)?.size??0;},
    async zRank(key,member){const rows=await api.zRange(key,0,Number.MAX_SAFE_INTEGER);const rank=rows.findIndex(row=>row.member===member);return rank<0?undefined:rank;},
    async watch(key){
      const revision=versions.get(key)||0;let operation=null;
      return {
        async multi(){},async unwatch(){},async discard(){},
        async set(k,v){operation=[k,v];},
        async exec(){
          if((versions.get(key)||0)!==revision)return [];
          if(!operation)return [];
          await api.set(...operation);return ['OK'];
        },
      };
    },
  };
  return api;
}
