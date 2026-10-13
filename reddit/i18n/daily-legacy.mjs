import source from './daily-legacy-en.json' with {type:'json'};
export const legacyDailyCatalog={...source.titles,...source.bodies,...source.choices,...source.suffixes};
for(const [es,en] of Object.entries(source.bodies))legacyDailyCatalog[es+' {0}']={en:en+' {0}',nested:['0']};
for(const [es,en] of Object.entries(source.choices))legacyDailyCatalog[es+'. Tu elección acompaña el siguiente tramo de la temporada.']=en+'. Your choice carries into the next stretch of the season.';
