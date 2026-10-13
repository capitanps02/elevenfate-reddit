import {tutorialSample} from '../client/tutorial-sample.mjs';
import {coverCatalog} from './cover-catalog.mjs';

// Public presentation only. No gates, weights, effects, outcomes or private NPC data.
// ES is an exact source copy checked against the final compiled event catalogue.
const eventId=tutorialSample.eventId;
const prefix='tutorial.'+eventId+'.';
export const careerStoryContent={
 es:{[eventId]:{
  title:tutorialSample.title,body:tutorialSample.body,
  visible:['La convocatoria es real.','No existe promesa de quedarse con el primer equipo.'],
  uncertain:['No sabes si eres proyecto real o un número para completar entrenamientos.'],
  choices:Object.fromEntries(tutorialSample.choices.map(choice=>[choice.id,choice.label])),
 }},
 en:{[eventId]:{
  title:coverCatalog.en[prefix+'title'],body:coverCatalog.en[prefix+'body'],
  visible:['The call-up is real.','There is no promise that you will stay with the first team.'],
  uncertain:['You do not know whether you are a genuine prospect or just making up the numbers in training.'],
  choices:Object.fromEntries(tutorialSample.choices.map(choice=>[choice.id,coverCatalog.en[prefix+choice.id+'.label']])),
 }},
};
export const careerStoryCatalog={
 es:{'career.story.pending':'Este capítulo está disponible en Español.','career.story.memoriesPending':'Los recuerdos de tu carrera están disponibles en Español.'},
 en:{'career.story.pending':'This chapter is available in Spanish.','career.story.memoriesPending':'Your career memories are available in Spanish.'},
};
