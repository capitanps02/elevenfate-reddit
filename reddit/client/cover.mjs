import {tutorialSample} from './tutorial-sample.mjs';
import {createCoverState} from './cover-state.mjs';
export function mountCover({root,assets={},readCareer,onContinue,onNew,onDaily,authenticated=true}){
 const doc=root.ownerDocument;
 let screen='menu',step=0,selection=null,disposed=false,state={status:'checking',hasCareer:null,error:''};
 const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;if(tag==='h1'){n.dataset.coverAction='heading';n.tabIndex=-1;}return n;};
 const button=(label,fn,key,primary=false)=>{const b=el('button',label,'cover-button'+(primary?' is-primary':''));b.type='button';b.dataset.coverAction=key;b.addEventListener('click',fn);return b;};
 function startPlaying(){if(!authenticated||state.status!=='ready'){show('menu');return;}if(state.hasCareer)onContinue();else onNew();}
 function focusHeading(){const h=root.querySelector('h1');if(h){h.tabIndex=-1;h.focus();}}
 function show(next){screen=next;render();focusHeading();}
 function render(){
  if(disposed)return;
  const focused=root.contains(doc.activeElement)?doc.activeElement?.dataset.coverAction:null;
  root.replaceChildren();
  const page=el('main',undefined,'cover-page');
  if(screen==='menu'){
   const image=el('img',undefined,'cover-art');image.src=assets.brand_cover||assets.hero_player||'./cover.png';image.alt='';image.addEventListener('error',()=>image.remove());page.append(image);
   const panel=el('section',undefined,'cover-content');
   panel.append(el('p','ELEVENFATE','cover-brand'),el('h1','Tu carrera. Tu legado.'),el('p','Tus decisiones construyen tu carrera.','cover-tagline'));
   const nav=el('nav',undefined,'cover-actions');nav.setAttribute('aria-label','Modos de juego');
   const resume=button('Continuar partida',onContinue,'continue',state.hasCareer===true);
   resume.disabled=!authenticated||state.status!=='ready'||!state.hasCareer;
   resume.setAttribute('aria-describedby','cover-status');
   const fresh=button('Nueva partida',onNew,'new',state.status==='ready'&&!state.hasCareer);fresh.disabled=!authenticated;
   const daily=button('Daily',onDaily,'daily');daily.append(el('span','Reto diario','cover-button-note'));daily.disabled=!authenticated;
   nav.append(resume,fresh,daily,button('Tutorial',()=>{step=0;selection=null;show('tutorial');},'tutorial'));
   panel.append(nav);
   const languages=el('div',undefined,'cover-languages');languages.setAttribute('role','group');languages.setAttribute('aria-label','Idioma');
   const spanish=button('Español',()=>{},'es');spanish.setAttribute('aria-pressed','true');
   const english=button('English',()=>{},'en');english.disabled=true;english.setAttribute('aria-describedby','cover-language-note');
   languages.append(spanish,english);panel.append(languages,el('p','English: traducción en preparación.','cover-caption'));
   panel.lastChild.id='cover-language-note';
   const status=el('p',!authenticated?'Inicia sesión en Reddit para guardar y jugar.':state.status==='checking'?'Comprobando tu partida…':state.status==='error'?state.error:state.hasCareer?'Tu partida está disponible.':'No hay partida guardada.','cover-status');status.id='cover-status';status.setAttribute('role',state.status==='error'?'alert':'status');panel.append(status);
   if(authenticated&&state.status==='error')panel.append(button('Reintentar',()=>model.refresh(),'retry'));
   page.append(panel);
  }else{
   const panel=el('section',undefined,'cover-tutorial');
   panel.append(el('p','DEMOSTRACIÓN · '+(step+1)+'/3','cover-brand'),el('h1',['Avanza tu carrera','Elige tu respuesta','Lee y continúa'][step]));
   panel.append(el('p',['Simular avanza hasta un partido o un momento importante.','Cuando aparece una decisión, toca una de sus opciones.','Lee lo ocurrido y pulsa Continuar para seguir.'][step]));
   const demo=el('div',undefined,'cover-demo');demo.setAttribute('aria-label','Ejemplo de controles; no modifica tu partida');
   if(step===0)demo.append(button('Simular',()=>{step=1;render();focusHeading();},'simulate',true));
   if(step===1){demo.append(el('h2',tutorialSample.title),el('p',tutorialSample.body,'tutorial-story'));for(const [i,choice] of tutorialSample.choices.entries()){const option=button(choice.label,()=>{selection=choice.id;step=2;render();focusHeading();},String.fromCharCode(97+i));option.dataset.choiceId=choice.id;demo.append(option);}}
   if(step===2){const choice=tutorialSample.choices.find(c=>c.id===selection);demo.append(el('p','EJEMPLO DE RESULTADO','cover-brand'),el('p',choice?.exampleResult||''),el('p','En tu partida, el contexto puede cambiar el resultado.','cover-caption'));demo.append(button('Continuar',()=>show('finish'),'acknowledge',true));}
   panel.append(demo,el('p','Demostración de una escena real. No cambia tu carrera ni consume el Daily.','cover-caption'));
   panel.append(button('Saltar tutorial',startPlaying,'skip'),button('Volver a portada',()=>show('menu'),'back'));
   page.append(panel);
   if(screen==='finish'){
    panel.replaceChildren(el('p','LISTO PARA JUGAR','cover-brand'),el('h1','Tu historia te espera'),el('p','Simula, decide y continúa.'));
    const details=el('details',undefined,'cover-features');details.append(el('summary','¿Qué puedes hacer en ElevenFate?'));
    for(const text of ['Carrera: partidos, contratos, fichajes y tu trayectoria.','Mundo: descubre las noticias de tu carrera.','Gestionar carrera: entrenamiento, salud y otras acciones opcionales.','Relaciones: consulta a las personas de tu historia.','Perfil: revisa tu jugador.','Tu partida: recupera, exporta o importa una copia.','Daily: juega el reto diario o practica por separado.'])details.append(el('p',text));
    panel.append(details);
    const play=button(state.hasCareer?'Continuar mi carrera':'Empezar mi carrera',startPlaying,'play',true);play.disabled=!authenticated||state.status!=='ready';panel.append(play);
    const daily=button('Jugar Daily',onDaily,'daily');daily.disabled=!authenticated;panel.append(daily,button('Volver a portada',()=>show('menu'),'back'));
   }
  }
  root.append(page);
  if(focused)root.querySelector('[data-cover-action="'+focused+'"]')?.focus({preventScroll:true});
 }
 function keyboard(event){if(event.key==='Escape'&&screen!=='menu'){event.preventDefault();show('menu');}}
 root.addEventListener('keydown',keyboard);
 const model=createCoverState({readCareer,onChange(next){state=next;if(screen==='menu'||screen==='finish')render();}});
 render();if(authenticated)model.refresh();else{state={status:'ready',hasCareer:false,error:''};render();}
 return ()=>{disposed=true;model.dispose();root.removeEventListener('keydown',keyboard);root.replaceChildren();};
}

