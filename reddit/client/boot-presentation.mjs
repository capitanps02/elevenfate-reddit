// Startup copy is isolated from authentication, network requests and save state.
export function mountBootPresentation({document,i18n,onRetry}){
 const error=document.querySelector('#load-error'),login=document.querySelector('#login-required'),retry=document.querySelector('#retry');
 let disposed=false;
 function render(){
  if(disposed)return;
  const locale=i18n.getLocale();error.lang=locale;login.lang=locale;
  if(document.documentElement)document.documentElement.lang=locale;
  error.querySelector('h1').textContent=i18n.t('global.loadError');error.querySelector('p').textContent=i18n.t('boot.readError');retry.textContent=i18n.t('global.retry');
  login.querySelector('h1').textContent=i18n.t('global.loginTitle');login.querySelector('p').textContent=i18n.t('global.loginBody');
 }
 const retryAction=()=>{if(!disposed)onRetry();};retry.addEventListener('click',retryAction);
 const unsubscribe=i18n.subscribe(render);render();
 return {
  showError(){if(disposed)return;render();login.hidden=true;error.hidden=false;error.setAttribute('role','alert');const heading=error.querySelector('h1');heading.tabIndex=-1;heading.focus({preventScroll:true});},
  dispose(){disposed=true;unsubscribe();retry.removeEventListener('click',retryAction);},
 };
}
