// One rendering recipe for the game and its visual acceptance catalogue.
import {mountGame} from '../../web/game-ui.js';
import css from '../../web/game-ui.css';
import careerCss from './career.css';
import sportCss from '../../web/sport-theme.css';
export const careerPresentationCss=css+'\n'+careerCss+'\n'+sportCss;
export function mountCareerPresentation(options){
 return mountGame({...options,css:careerPresentationCss,compactHome:true,showLanguageControl:false,showPauseControl:false,autoCreateOnLoad:false,deferAutoResume:true});
}
