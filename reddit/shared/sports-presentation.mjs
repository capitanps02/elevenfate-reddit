// Legacy strings below are fixed enum values from league-simulator, never
// translated save data. Add public identifiers without changing competition state.
const honourIds={'Campeón de liga':'league-champion','Máximo goleador':'top-scorer','Jugador de la temporada':'player-of-season','Champions · formato adaptado':'continental-champion'};
const stageIds={Octavos:'round-of-16',Cuartos:'quarter-final',Semifinal:'semi-final',Final:'final'};
export const publicSportsLeague=(league,divisionId)=>({...league,divisionId});
export const publicSportsHonours=items=>(items??[]).map(item=>({...item,honourId:honourIds[item.title]??null}));
export function publicSportsContinental(continental){
 return {...continental,formatId:'groups-knockout-v1',matches:continental.matches.map(match=>({...match,stageId:Number.isInteger(match.group)?'group':stageIds[match.stage]??null}))};
}
