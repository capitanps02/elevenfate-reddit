import {createPresentationLocale} from './presentation-locale.mjs';
import {tutorialSample} from './tutorial-sample.mjs';
import {createCoverState} from './cover-state.mjs';
export function mountCover({root,assets={},readCareer,onContinue,onNew,onDaily,authenticated=true,i18n=createPresentationLocale()}){
 const doc=root.ownerDocument,t=(id,parameters)=>i18n.t(id,parameters);
 let screen='menu',step=0,selection=null,disposed=false,state={status:'checking',hasCareer:null,error:''};
 const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;if(tag==='h1'){n.dataset.coverAction='heading';n.tabIndex=-1;}return n;};
 const button=(label,fn,key,primary=false)=>{const b=el('button',label,'cover-button'+(primary?' is-primary':''));b.type='button';b.dataset.coverAction=key;b.addEventListener('click',fn);return b;};
 function startPlaying(){if(!authenticated||state.status!=='ready'){show('menu');return;}if(state.hasCareer)onContinue();else onNew();}
 function focusHeading(){const h=root.querySelector('h1');if(h){h.tabIndex=-1;h.focus();}}
 function show(next){screen=next;render();focusHeading();}
 function render(){
  if(disposed)return;
  root.lang=i18n.getLocale();if(doc.documentElement)doc.documentElement.lang=i18n.getLocale();
  const focused=root.contains(doc.activeElement)?doc.activeElement?.dataset.coverAction:null;
  root.replaceChildren();
  const page=el('main',undefined,'cover-page');
  if(screen==='menu'){
   const image=el('img',undefined,'cover-art');image.src=assets.brand_cover||assets.hero_player||'./cover.png';image.alt='';image.addEventListener('error',()=>image.remove());page.append(image);
   const panel=el('section',undefined,'cover-content');
   panel.append(el('p','ELEVENFATE','cover-brand'),el('h1',t('cover.title')),el('p',t('cover.tagline'),'cover-tagline'));
   const nav=el('nav',undefined,'cover-actions');nav.setAttribute('aria-label',t('cover.modes'));
   const resume=button(t('cover.continue'),onContinue,'continue',state.hasCareer===true);
   resume.disabled=!authenticated||state.status!=='ready'||!state.hasCareer;
   resume.setAttribute('aria-describedby','cover-status');
   const fresh=button(t('cover.new'),onNew,'new',state.status==='ready'&&!state.hasCareer);fresh.disabled=!authenticated;
   const daily=button('Daily',onDaily,'daily');daily.append(el('span',t('cover.dailyNote'),'cover-button-note'));daily.disabled=!authenticated;
   nav.append(resume,fresh,daily,button(t('cover.tutorial'),()=>{step=0;selection=null;show('tutorial');},'tutorial'));
   panel.append(nav);
   const languages=el('div',undefined,'cover-languages');languages.setAttribute('role','group');languages.setAttribute('aria-label',t('cover.language'));
   const spanish=button('Español',()=>i18n.setLocale('es'),'es');spanish.setAttribute('aria-pressed',String(i18n.getLocale()==='es'));
   const english=button('English',()=>i18n.setLocale('en'),'en');english.disabled=!i18n.isAvailable('en');english.setAttribute('aria-pressed',String(i18n.getLocale()==='en'));english.setAttribute('aria-describedby','cover-language-note');
   languages.append(spanish,english);panel.append(languages,el('p',t(i18n.isAvailable('en')?'cover.languageReady':'cover.languagePending'),'cover-caption'));
   panel.lastChild.id='cover-language-note';
   const status=el('p',!authenticated?t('cover.login'):state.status==='checking'?t('cover.checking'):state.status==='error'?(i18n.getLocale()==='es'?state.error:t('cover.readError')):state.hasCareer?t('cover.available'):t('cover.empty'),'cover-status');status.id='cover-status';status.setAttribute('role',state.status==='error'?'alert':'status');panel.append(status);
   if(authenticated&&state.status==='error')panel.append(button(t('cover.retry'),()=>model.refresh(),'retry'));
   page.append(panel);
  }else{
   const panel=el('section',undefined,'cover-tutorial');
   panel.append(el('p',t('tutorial.progress',{step:step+1}),'cover-brand'),el('h1',t(['tutorial.advanceTitle','tutorial.choiceTitle','tutorial.resultTitle'][step])));
   panel.append(el('p',t(['tutorial.advanceBody','tutorial.choiceBody','tutorial.resultBody'][step])));
   const demo=el('div',undefined,'cover-demo');demo.setAttribute('aria-label',t('tutorial.demoA11y'));
   if(step===0)demo.append(button(t('tutorial.simulate'),()=>{step=1;render();focusHeading();},'simulate',true));
   if(step===1){demo.append(el('h2',t('tutorial.'+tutorialSample.eventId+'.title')),el('p',t('tutorial.'+tutorialSample.eventId+'.body'),'tutorial-story'));for(const [i,choice] of tutorialSample.choices.entries()){const option=button(t('tutorial.'+tutorialSample.eventId+'.'+choice.id+'.label'),()=>{selection=choice.id;step=2;render();focusHeading();},String.fromCharCode(97+i));option.dataset.choiceId=choice.id;demo.append(option);}}
   if(step===2){const choice=tutorialSample.choices.find(c=>c.id===selection);demo.append(el('p',t('tutorial.exampleLabel'),'cover-brand'),el('p',choice?t('tutorial.'+tutorialSample.eventId+'.'+choice.id+'.result'):''),el('p',t('tutorial.contextNote'),'cover-caption'));demo.append(button(t('tutorial.continue'),()=>show('finish'),'acknowledge',true));}
   panel.append(demo,el('p',t('tutorial.disclaimer'),'cover-caption'));
   panel.append(button(t('tutorial.skip'),startPlaying,'skip'),button(t('tutorial.back'),()=>show('menu'),'back'));
   page.append(panel);
   if(screen==='finish'){
    panel.replaceChildren(el('p',t('tutorial.ready'),'cover-brand'),el('h1',t('tutorial.finishTitle')),el('p',t('tutorial.finishBody')));
    const details=el('details',undefined,'cover-features');details.append(el('summary',t('tutorial.featuresTitle')));
    for(const id of ['tutorial.featuresCareer','tutorial.featuresWorld','tutorial.featuresActions','tutorial.featuresRelations','tutorial.featuresProfile','tutorial.featuresSave','tutorial.featuresDaily'])details.append(el('p',t(id)));
    panel.append(details);
    const play=button(state.hasCareer?t('tutorial.resumeCareer'):t('tutorial.startCareer'),startPlaying,'play',true);play.disabled=!authenticated||state.status!=='ready';panel.append(play);
    const daily=button(t('tutorial.playDaily'),onDaily,'daily');daily.disabled=!authenticated;panel.append(daily,button(t('tutorial.back'),()=>show('menu'),'back'));
   }
  }
  root.append(page);
  if(focused)root.querySelector('[data-cover-action="'+focused+'"]')?.focus({preventScroll:true});
 }
 function keyboard(event){if(event.key==='Escape'&&screen!=='menu'){event.preventDefault();show('menu');}}
 root.addEventListener('keydown',keyboard);
 const unsubscribe=i18n.subscribe(()=>render());
 const model=createCoverState({readCareer,onChange(next){state=next;if(screen==='menu'||screen==='finish')render();}});
 render();if(authenticated)model.refresh();else{state={status:'ready',hasCareer:false,error:''};render();}
 return ()=>{disposed=true;unsubscribe();model.dispose();root.removeEventListener('keydown',keyboard);root.replaceChildren();};
}

