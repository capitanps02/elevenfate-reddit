// Image and existing title only: presentation never alters the simulation.
export function createStoryScene({document:doc,clip,posterUrl,locale}){
  const element=doc.createElement('section');element.className='event-cutscene cutscene-fallback';
  element.dataset.cutsceneState='fallback';element.setAttribute('aria-label',(locale?.text('Escena: '+clip.title) ?? 'Escena: '+clip.title));
  if(posterUrl){const img=doc.createElement('img');img.className='cutscene-poster';img.src=posterUrl;img.alt='';img.decoding='async';element.append(img);}
  const title=doc.createElement('p');title.className='muted';title.textContent=locale?.text(clip.title)??clip.title;element.append(title);
  return {element,dispose(){}};
}
