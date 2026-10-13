import {coverCopy} from './cover-catalog.mjs';
export function createCoverCopy(locale){
 return (id,parameters={})=>{
  const source=coverCopy[id];
  if(source===undefined)throw Error('Missing cover copy: '+id);
  return locale.text(source.replace(/\{([a-zA-Z]+)\}/g,(_,key)=>String(parameters[key]??'')));
 };
}
