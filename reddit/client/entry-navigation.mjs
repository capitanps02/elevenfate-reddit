// Owns entry-layer history only. Career-to-career history remains in mountGame.
export function createEntryNavigation({window:win,onRoute,canLeave=()=>true,captureState=()=>null}){
 let current='cover',lastState={efEntry:'cover'};
 const known=new Set(['cover','career','daily']);
 function enter(route,{push=true,context={}}={}){
  if(!known.has(route))throw Error('Unknown entry route');
  current=route;lastState={...context,efEntry:route};
  const method=push?'pushState':'replaceState';win.history?.[method]?.(lastState,'');
 }
 function popstate(event){
  const target=event.state?.efEntry;if(!known.has(target))return;
  // The career component already handles its tabs and immersive scenes.
  if(current==='career'&&target==='career')return;
  if(!canLeave(current)){
   win.history?.pushState?.(captureState(current)||lastState,'');return;
  }
  current=target;lastState=event.state;onRoute(target,event.state);
 }
 win.addEventListener('popstate',popstate);
 return {enter,getRoute:()=>current,back(fallback){if(win.history?.back)win.history.back();else{enter(fallback,{push:false});onRoute(fallback,lastState);}},dispose(){win.removeEventListener('popstate',popstate);}};
}
