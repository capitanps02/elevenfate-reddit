import {FakeNode} from './cover-dom.mjs';
export function makeGameRoot(){
 const doc={activeElement:null,visibilityState:'visible',title:'',addEventListener(){},removeEventListener(){}};
 doc.defaultView={addEventListener(){},removeEventListener(){},history:{replaceState(){},pushState(){}}};
 function make(tag){
  const n=new FakeNode(tag,doc);n.style={setProperty(){}};
  n.classList={add(...names){n.className=[n.className||'',...names].join(' ');},toggle(name,on){const current=new Set((n.className||'').split(' ').filter(Boolean));if(on)current.add(name);else current.delete(name);n.className=[...current].join(' ');},contains(name){return (n.className||'').split(' ').includes(name);}};
  n.prepend=(...nodes)=>{for(const child of nodes)child.parentNode=n;n.children.unshift(...nodes);};
  n.removeEventListener=()=>{};
  n.showModal=()=>{n.open=true;};n.close=()=>{n.open=false;n.listeners.close?.();};
  n.querySelector=selector=>all(n).find(child=>selector==='dialog[open]'?child.tagName==='DIALOG'&&child.open:selector.startsWith('.')?child.classList.contains(selector.slice(1)):child.tagName===selector.toUpperCase())||null;
  n.querySelectorAll=selector=>all(n).filter(child=>selector.split(',').some(tag=>child.tagName===tag.toUpperCase()));
  return n;
 }
 doc.createElement=make;doc.createElementNS=(ns,tag)=>{const n=make(tag);n.namespaceURI=ns;return n;};doc.createDocumentFragment=()=>make('fragment');
 return make('section');
}
export function all(root){return root.children.flatMap(child=>[child,...all(child)]);}
export function text(node){return node.textContent+node.children.map(text).join('');}
export function findButton(root,label){return all(root).find(n=>n.tagName==='BUTTON'&&text(n)===label);}
export function findInput(root,label){return all(root).find(n=>n.tagName==='INPUT'&&n.attributes['aria-label']===label);}
