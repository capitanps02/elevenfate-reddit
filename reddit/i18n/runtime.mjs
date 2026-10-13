import english from './en.json' with {type:'json'};
import dailyEnglish from './daily-en.json' with {type:'json'};
import serverEnglish from './server-en.json' with {type:'json'};
import engineEnglish from './engine-en.json' with {type:'json'};
import engineErrorsEnglish from './engine-errors-en.json' with {type:'json'};
import worldEnglish from './world-en.json' with {type:'json'};
import marketEnglish from './market-en.json' with {type:'json'};
import {legacyDailyCatalog} from './daily-legacy.mjs';
import {helpCatalog} from './help-en.mjs';

const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const slots=text=>[...text.matchAll(/\{(\d+)\}/g)].map(match=>match[1]);
export function mergeCatalogs(...catalogs){
 const result=Object.create(null);
 for(const catalog of catalogs)for(const [source,entry] of Object.entries(catalog)){
  if(Object.hasOwn(result,source)&&JSON.stringify(result[source])!==JSON.stringify(entry))throw Error('Conflicting catalog translation: '+source);
  result[source]=entry;
 }
 return result;
}

export function compileCatalog(entries){
 const exact=new Map(),templates=[];
 for(const [es,entry] of Object.entries(entries)){
  const en=typeof entry==='string'?entry:entry?.en;
  if(typeof en!=='string'||!en.trim()||slots(es).sort().join()!==slots(en).sort().join())throw Error(`Invalid translation parameters: ${es}`);
  const params=slots(es);
  if(typeof entry==='object'&&(entry.nested??[]).some(param=>!params.includes(param)))throw Error(`Invalid nested translation parameters: ${es}`);
  const fallback=typeof entry==='object'?entry.fallback??{}:{};
  if(Object.entries(fallback).some(([param,value])=>!(entry.nested??[]).includes(param)||typeof value!=='string'||!value.trim()))throw Error(`Invalid translation fallback: ${es}`);
  if(/\}\{/.test(es))throw Error(`Ambiguous adjacent translation parameters: ${es}`);
  if(!params.length){exact.set(es,en);continue;}
  const parts=es.split(/\{\d+\}/);
  if(parts.join('').trim().length<4)throw Error(`Translation template too broad: ${es}`);
  const expression=new RegExp('^'+parts.map(escape).join('([\\s\\S]*?)')+'$');
  templates.push({es,en,params,expression,nested:entry.nested??[],fallback,weight:parts.join('').length});
 }
 templates.sort((a,b)=>b.weight-a.weight||a.es.localeCompare(b.es));
 return {exact,templates};
}

const compiled=compileCatalog(mergeCatalogs(english,dailyEnglish,serverEnglish,engineEnglish,engineErrorsEnglish,worldEnglish,marketEnglish,legacyDailyCatalog,helpCatalog));
export const exactInterfaceTranslation=source=>compiled.exact.get(source);
export function createLocale({storage=null,key='elevenfate.language.v1',initial,document:doc=null,catalog=compiled,enabled=true}={}){
 let language='es';
 if(enabled&&(initial==='en'||initial==='es'))language=initial;
 else if(enabled)try{if(storage?.getItem(key)==='en')language='en';}catch{}
 const listeners=new Set(),missing=new Set(),formatters=new Map(),measurements=[];
 const updateLang=()=>{if(doc)doc.documentElement.lang=language;};
 updateLang();
 function text(value,depth=0){
  if(value==null||language==='es')return value;
  const raw=String(value),direct=catalog.exact.get(raw);
  if(direct!==undefined)return direct;
  if(/^[\d\s.,+−–%:#/€£$-]+$/.test(raw))return value;
  for(const item of catalog.templates){
   const match=item.expression.exec(raw);
   if(!match)continue;
   const args={};let inconsistent=false;
   for(const [i,param] of item.params.entries()){if(Object.hasOwn(args,param)&&args[param]!==match[i+1])inconsistent=true;args[param]=match[i+1];}
   if(inconsistent)continue;
   for(const param of item.nested)if(depth<3){const source=args[param],translated=text(source,depth+1);args[param]=translated===source&&!catalog.exact.has(source)&&Object.hasOwn(item.fallback,param)?item.fallback[param]:translated;}
   return item.en.replace(/\{(\d+)\}/g,(_,param)=>args[param]);
  }
  if(missing.size<2048&&/[áéíóúñ¿¡]|\b(?:carrera|temporada|partida|guardado|años|equipo|decisión|contrato)\b/i.test(raw))missing.add(raw);
  return value;
 }
 function set(next,{persist=true}={}){
  if(!['es','en'].includes(next))return false;
  if(next==='en'&&!enabled)return false;
  if(next===language)return true;
  const started=performance.now();
  language=next;updateLang();
  if(persist)try{storage?.setItem(key,next);}catch{}
  for(const listener of [...listeners])listener(language);
  const duration=performance.now()-started;measurements.push(duration);if(measurements.length>256)measurements.shift();
  if(doc)doc.documentElement.dataset.languageRenderMs=duration.toFixed(3);
  return true;
 }
 function formatter(kind,options){
  const cacheKey=language+kind+JSON.stringify(options);
  if(!formatters.has(cacheKey))formatters.set(cacheKey,new Intl[kind](language==='en'?'en-GB':'es-ES',options));
  return formatters.get(cacheKey);
 }
 return {
  get language(){return language;},get enabled(){return enabled;},get intlLocale(){return language==='en'?'en-GB':'es-ES';},
  text,set,subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  addCatalog(entries){
   const next=compileCatalog(entries);
   for(const [source,translation] of next.exact){const existing=catalog.exact.get(source);if(existing!==undefined&&existing!==translation)throw Error('Conflicting display translation: '+source);}
   catalog={exact:new Map([...catalog.exact,...next.exact]),templates:[...catalog.templates,...next.templates].sort((a,b)=>b.weight-a.weight||a.es.localeCompare(b.es))};
  },
  date(value,options={day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}){return formatter('DateTimeFormat',options).format(new Date(value));},
  number(value,options={}){return formatter('NumberFormat',options).format(value);},
  missing:()=>[...missing],clearMissing:()=>missing.clear(),measurements:()=>[...measurements],
  control(owner){
   const button=owner.createElement('button');button.type='button';button.className='language-toggle';button.dataset.languageControl='';
   button.hidden=!enabled;
   const update=()=>{button.textContent=language==='es'?'English':'Español';button.setAttribute('aria-label',language==='es'?'Switch to English':'Cambiar a español');button.title=language==='es'?'Switch to English':'Cambiar a español';button.lang=language==='es'?'en':'es';};
   button.addEventListener('click',()=>set(language==='es'?'en':'es'));update();
   listeners.add(update);
   return {element:button,dispose:()=>listeners.delete(update)};
  }
 };
}

export {preservePresentation} from './presentation.mjs';
