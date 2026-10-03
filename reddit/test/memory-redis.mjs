// Test/preview dependency only. Models WATCH -> read -> MULTI -> EXEC conflicts.
export function createMemoryRedis(){
  const values=new Map(),versions=new Map();
  const api={
    async get(key){return values.get(key);},
    async set(key,value){values.set(key,value);versions.set(key,(versions.get(key)||0)+1);},
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
