import {createLocale} from './runtime.mjs';
export function createBrowserLocale(doc=document,win=window){
 let storage;try{storage=win.localStorage;}catch{}
 const enabled=typeof __ELEVENFATE_ENGLISH_ENABLED__==='undefined'||__ELEVENFATE_ENGLISH_ENABLED__;
 const key='elevenfate.language.v1',locale=createLocale({storage,key,document:doc,enabled});
 let lastStored;try{lastStored=storage?.getItem(key);}catch{}
 const sync=()=>{try{const next=storage?.getItem(key);if(next!==lastStored){lastStored=next;locale.set(next==='en'?'en':'es',{persist:false});}}catch{}};
 const storageChanged=event=>{if(event.key===key)sync();};
 win.addEventListener('focus',sync);win.addEventListener('storage',storageChanged);
 return locale;
}
