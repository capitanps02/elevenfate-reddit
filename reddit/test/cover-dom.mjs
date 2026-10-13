export class FakeNode {
 constructor(tag,document){this.tagName=tag.toUpperCase();this.ownerDocument=document;this.children=[];this.dataset={};this.attributes={};this.listeners={};this.parentNode=null;this.disabled=false;this.textContent='';}
 get firstChild(){if(this.children[0])return this.children[0];if(!this.textContent)return null;if(!this.textNode){const parent=this;this.textNode={nodeType:3,get data(){return parent.textContent;},set data(value){parent.textContent=value;}};}return this.textNode;}
 get lastChild(){return this.children.at(-1)||null;}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this.append(...nodes);}
 hasAttribute(key){return Object.hasOwn(this.attributes,key);}
 setAttribute(key,value){this.attributes[key]=String(value);}
 addEventListener(type,fn){this.listeners[type]=fn;}
 removeEventListener(type,fn){if(this.listeners[type]===fn)delete this.listeners[type];}
 focus(){this.ownerDocument.activeElement=this;}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);}
 querySelector(selector){
  const match=node=>{const action=/^\[data-cover-action="([^"]+)"\]$/.exec(selector);return action?node.dataset.coverAction===action[1]:node.tagName===selector.toUpperCase();};
  for(const node of this.children){if(match(node))return node;const found=node.querySelector(selector);if(found)return found;}return null;
 }
 click(){if(!this.disabled)this.listeners.click?.({target:this});}
}
export function makeRoot(){const document={activeElement:null,createElement(tag){return new FakeNode(tag,this);}};return new FakeNode('section',document);}

