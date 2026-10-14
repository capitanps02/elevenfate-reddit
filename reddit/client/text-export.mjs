// Reddit's sandbox does not allow anchor downloads. Offer an explicit, local text copy.
export function createTextExport({document:doc,locale,clipboard=globalThis.navigator?.clipboard}){
 let current=null;
 const t=source=>locale.text(source);
 return (raw,filename)=>{
  if(typeof raw!=='string')throw TypeError('Export text must be a string.');
  current?.close();
  let previous=doc.activeElement;while(previous?.shadowRoot?.activeElement)previous=previous.shadowRoot.activeElement;
  const dialog=doc.createElement('dialog');dialog.className='help-dialog text-export-dialog';current=dialog;
  const heading=doc.createElement('h1'),instructions=doc.createElement('p'),area=doc.createElement('textarea'),actions=doc.createElement('div'),status=doc.createElement('p');
  heading.id='text-export-title';heading.tabIndex=-1;dialog.setAttribute('aria-labelledby',heading.id);
  area.value=raw;area.readOnly=true;area.spellcheck=false;area.className='text-export-content';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  let message='',busy=false,disposed=false;
  const button=(source,action)=>{const node=doc.createElement('button');node.type='button';node.textContent=t(source);node.addEventListener('click',action);actions.append(node);return node;};
  const select=()=>{area.focus();area.select();};
  const selected=button('Seleccionar todo',select);
  const copy=button('Copiar texto',async()=>{
   if(busy)return;busy=true;copy.disabled=true;
   try{if(!clipboard?.writeText)throw Error('Clipboard unavailable');await clipboard.writeText(raw);message='Texto copiado.';}
   catch{select();message='Copia el texto seleccionado y guárdalo como {0}.';}
   finally{busy=false;if(!disposed){copy.disabled=false;render();}}
  });
  const close=button('Cerrar',()=>dialog.close());
  function render(){
   dialog.lang=locale.language;heading.textContent=t('Exportar una copia');
   instructions.textContent=t('Guarda este texto como {0}. La copia no cambia tus datos.').replace('{0}',()=>filename);
   area.setAttribute('aria-label',t('Contenido de la copia'));selected.textContent=t('Seleccionar todo');copy.textContent=t('Copiar texto');close.textContent=t('Cerrar');status.textContent=t(message).replace('{0}',()=>filename);
  }
  const unsubscribe=locale.subscribe(render);render();dialog.append(heading,instructions,area,actions,status);doc.body.append(dialog);
  dialog.addEventListener('close',()=>{disposed=true;unsubscribe();dialog.remove();if(current===dialog)current=null;if(previous?.isConnected)previous.focus({preventScroll:true});},{once:true});
  dialog.showModal();heading.focus({preventScroll:true});
 };
}
