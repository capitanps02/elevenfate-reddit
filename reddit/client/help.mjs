import {navigateTo} from '@devvit/web/client';
import {HELP_PAGES,reportUrlForLanguage} from '../shared/help-content.mjs';
import {requestJSON} from './request-timeout.mjs';
import {preservePresentation} from '../i18n/presentation.mjs';

export function createHelp({request=fetch,onDeleted=()=>{},locale}={}){
  let analytics=null,openPanel=null,previousScreen='home';
  let requester=request,scope=null,busy=false,statusMessage='',statusError=false,languageControl;
  const dialog=document.createElement('dialog');dialog.className='help-dialog';dialog.setAttribute('aria-labelledby','help-title');document.body.append(dialog);
  const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=(locale?.text(text) ?? text);return el;};
  const button=(text,action)=>{const el=node('button',text);el.type='button';el.onclick=action;return el;};
  const download=(data)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=node('a');link.href=url;link.download='elevenfate-datos.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  let currentPage='home';
  const setStatus=(message,error=false)=>{statusMessage=message;statusError=error;const status=dialog.querySelector('[data-account-status]');if(status){status.textContent=locale?.text(message)??message;status.setAttribute('role',error?'alert':'status');}};
  const setBusy=value=>{busy=value;for(const control of dialog.querySelectorAll('[data-account-control]'))control.disabled=value;};
  function render(page='home'){
    currentPage=page;
    languageControl?.dispose();
    dialog.replaceChildren();const header=node('header'),heading=node('h1',HELP_PAGES[page]?.title??'Ayuda y datos');heading.id='help-title';heading.tabIndex=-1;header.append(heading,button('Cerrar',()=>dialog.close()));dialog.append(header);
    if(locale){languageControl=locale.control(document);header.append(languageControl.element);}
    const body=node('div');body.className='help-body';dialog.append(body);
    if(HELP_PAGES[page]){
      for(const paragraph of HELP_PAGES[page].paragraphs)body.append(node('p',paragraph));
      body.append(button('Volver a ayuda',()=>render()));
    }else{
      body.append(node('p','Carrera libre: crea tu personaje y continúa tu historia a tu ritmo. Daily: 30 decisiones, un intento competitivo y reinicio a las 00:00 UTC. Práctica: puedes repetir sin entrar en el ranking. Cada elección muestra consecuencias; al terminar puedes consultar cómo se calculan tus puntos.'));
      body.append(node('h2','Reportar un problema'),node('p','Indica la pantalla, qué esperabas, qué ocurrió y si usabas Reddit móvil o web. Si compartes una captura, oculta datos personales. No se adjuntan partidas ni identificadores automáticamente. Tú decides si envías el mensaje.'),button('Abrir modmail de r/ElevenFate',()=>navigateTo(reportUrlForLanguage(locale?.language))));
      body.append(button('Privacidad',()=>render('privacy')),button('Condiciones',()=>render('terms')));
      if(scope){
        if(analytics){const title=node('h2','Ayúdanos a mejorar ElevenFate');const copy=node('p',locale?.language==='en'?'Optional: share play time, screens, progress and error counts. No story choices, names or saves. Data is kept for up to 90 days. Turning it off deletes these measurements.': 'Opcional: compartir tiempo de juego, pantallas, progreso y recuentos de errores. Sin decisiones narrativas, nombres ni partidas. Conservación máxima de 90 días. Desactivar borra estas mediciones.');const toggle=button(analytics.allowed?(locale?.language==='en'?'Stop sharing analytics':'Dejar de compartir estadísticas'):(locale?.language==='en'?'Share usage statistics':'Compartir estadísticas de uso'),async()=>{toggle.disabled=true;try{await analytics.configure(!analytics.allowed);render();}catch(e){setStatus(e.message,true);toggle.disabled=false;}});body.append(title,copy,toggle);if(openPanel&&analytics.admin)body.append(button('Ver datos del juego (privado)',openPanel));}

        body.append(node('h2','Tus datos en esta comunidad'),node('p','Tu partida → Eliminar carrera borra solo la carrera y su copia. La exportación de datos incluye los registros de todos los modos, incluso archivos Daily comprimidos para soporte; no es una copia importable de la carrera.'));
        const status=node('p',statusMessage);status.dataset.accountStatus='';status.setAttribute('role',statusError?'alert':'status');status.setAttribute('aria-live','polite');
        const run=async(action)=>{if(busy)return;setBusy(true);setStatus('Procesando…');try{await action();}catch(error){setStatus(error.message,true);}finally{setBusy(false);}};
        const exportButton=button('Exportar todos mis datos',()=>run(async()=>{const {response,data}=await requestJSON('/api/account/export',{}, {fetcher:requester});if(!response.ok)throw Error(data.error||'No se pudo exportar.');download(data);setStatus('Exportación descargada.');}));
        const warning=node('p','Eliminar todos mis datos borra carrera, copia, Daily, prácticas, ranking y estadísticas de uso. No se puede deshacer. Conservaremos únicamente un marcador de cuenta hasta las siguientes 00:00 UTC para bloquear otro Daily competitivo. Las sesiones antiguas dejarán de funcionar. Descarga antes una exportación si la necesitas.');
        const label=node('label'),confirm=node('input');confirm.type='checkbox';label.append(confirm,document.createTextNode(locale?.text(' Entiendo el borrado y el marcador temporal hasta las 00:00 UTC.')??' Entiendo el borrado y el marcador temporal hasta las 00:00 UTC.'));
        const eraseButton=button('Eliminar todos mis datos',()=>{if(!confirm.checked){setStatus('Marca la confirmación antes de eliminar.');return;}run(async()=>{
          const {response,data}=await requestJSON('/api/account',{method:'DELETE'}, {fetcher:requester});if(!response.ok)throw Error(data.error||'No se pudo confirmar el borrado. Reintenta.');
          try{for(const key of Object.keys(localStorage))if(key===scope||key.startsWith(scope+'.'))localStorage.removeItem(key);}catch{}
          onDeleted();scope=null;render('deleted');
        });});
        const controls=[exportButton,eraseButton,confirm];for(const control of controls){control.dataset.accountControl='';control.disabled=busy;}body.append(exportButton,warning,label,eraseButton,status);
      }
      if(page==='deleted')body.prepend(node('p','Datos eliminados. El marcador competitivo caduca a las 00:00 UTC. Vuelve a abrir el juego para iniciar una sesión nueva.'));
    }
    heading.focus({preventScroll:true});
  }
  dialog.addEventListener('close',()=>analytics?.observe('screen',previousScreen));
  const unsubscribe=locale?.subscribe(()=>{if(dialog.open)preservePresentation(dialog,()=>render(currentPage));});
  return {open:()=>{previousScreen=analytics?.screen??'home';analytics?.observe('screen','help');render();if(!dialog.open)dialog.showModal();dialog.querySelector('h1').focus();},setAnalytics:(value,panel)=>{analytics=value;openPanel=panel;},setRequest:next=>requester=next,setScope:next=>scope=next,dispose:()=>{unsubscribe?.();languageControl?.dispose();dialog.remove();}};
}
