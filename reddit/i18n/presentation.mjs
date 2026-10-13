export function preservePresentation(root,render){
 const owner=root.ownerDocument??root,active=root.activeElement??owner.activeElement;
 const controls=[...root.querySelectorAll('input,select,textarea,details')];
 const state=controls.map(node=>({tag:node.tagName,type:node.type,value:node.value,checked:node.checked,open:node.open,start:node.selectionStart,end:node.selectionEnd}));
 const focusIndex=[...root.querySelectorAll('button,input,select,textarea,[tabindex]')].indexOf(active);
 const scroll=[...root.querySelectorAll('main,.help-body,.daily-panel')].map(node=>[node.scrollTop,node.scrollLeft]);
 render();
 const next=[...root.querySelectorAll('input,select,textarea,details')];
 state.forEach((item,i)=>{const node=next[i];if(!node||node.tagName!==item.tag||node.type!==item.type)return;if(item.value!==undefined&&node.type!=='file')node.value=item.value;if(item.checked!==undefined)node.checked=item.checked;if(item.open!==undefined)node.open=item.open;try{if(item.start!==null&&item.start!==undefined)node.setSelectionRange(item.start,item.end);}catch{}});
 if(focusIndex>=0)root.querySelectorAll('button,input,select,textarea,[tabindex]')[focusIndex]?.focus({preventScroll:true});
 [...root.querySelectorAll('main,.help-body,.daily-panel')].forEach((node,i)=>{if(scroll[i]){node.scrollTop=scroll[i][0];node.scrollLeft=scroll[i][1];}});
}
