// Keep archives in the same transactional save as the active attempt. Column
// names are stored once; hydration restores the original simulation objects.
const own=(object,key)=>Object.hasOwn(object,key);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const forbidden=new Set(['__proto__','prototype','constructor']);
function pack(records){
 const keys=[...new Set(records.flatMap(record=>Object.keys(record)))];
 if(keys.length>30)throw new Error('Archive has too many columns');
 const nested={};
 for(let i=0;i<keys.length;i++)if(records.length&&records.every(record=>plain(record[keys[i]])))nested[i]=pack(records.map(record=>record[keys[i]]));
 const rows=records.map(record=>{let mask=0;const values=[];for(let i=0;i<keys.length;i++)if(own(record,keys[i])&&record[keys[i]]!==undefined){mask+=2**i;values.push(own(nested,i)?null:record[keys[i]]);}return [mask,...values];});
 return {keys,rows,...(Object.keys(nested).length?{nested}:{})};
}
function unpack(table,depth=0){
 if(depth>6||!plain(table)||!Array.isArray(table.keys)||table.keys.length>30||new Set(table.keys).size!==table.keys.length||table.keys.some(key=>typeof key!=='string'||forbidden.has(key))||!Array.isArray(table.rows)||table.rows.length>5000)throw new Error('Invalid archive table');
 const nested={};
 if(table.nested!==undefined){
  if(!plain(table.nested))throw new Error('Invalid nested archive');
  for(const [key,value]of Object.entries(table.nested)){
   if(!/^\d+$/.test(key)||String(Number(key))!==key||Number(key)>=table.keys.length)throw new Error('Invalid archive column');
   nested[key]=unpack(value,depth+1);if(nested[key].length!==table.rows.length)throw new Error('Invalid archive row count');
  }
 }
 return table.rows.map((row,index)=>{
  if(!Array.isArray(row)||!Number.isSafeInteger(row[0])||row[0]<0||row[0]>=2**table.keys.length)throw new Error('Invalid archive presence mask');
  const result={};let offset=1;
  for(let i=0;i<table.keys.length;i++)if(Math.floor(row[0]/2**i)%2){
   if(offset>=row.length)throw new Error('Missing archive cell');
   if(own(nested,i)&&row[offset]!==null)throw new Error('Invalid nested archive placeholder');
   result[table.keys[i]]=own(nested,i)?nested[i][index]:row[offset];offset++;
  }else if(own(nested,i))throw new Error('Missing nested archive cell');
  if(offset!==row.length)throw new Error('Extra archive cells');
  return result;
 });
}
export function serializeDailyRun(run){
 if(![5,6,7].includes(run.version))return JSON.stringify(run);
 const competitions=run.competitions.map(season=>!season.closed?season:{...season,matches:pack(season.matches),player:{...season.player,matches:pack(season.player.matches)},...(season.cupPlayer?{cupPlayer:{...season.cupPlayer,matches:pack(season.cupPlayer.matches)}}:{})});
 const cups=run.cups.map(cup=>!cup.closed?cup:{...cup,matches:pack(cup.matches)});
 return JSON.stringify({...run,competitions,cups,archiveFormat:1});
}
export function hydrateDailyArchive(run){
 if(run.archiveFormat===undefined)return run;
 if(![5,6,7].includes(run.version)||run.archiveFormat!==1||!Array.isArray(run.competitions)||!Array.isArray(run.cups))throw new Error('Unknown Daily archive');
 const competitions=run.competitions.map(season=>!season.closed?season:{...season,matches:unpack(season.matches),player:{...season.player,matches:unpack(season.player.matches)},...(season.cupPlayer?{cupPlayer:{...season.cupPlayer,matches:unpack(season.cupPlayer.matches)}}:{})});
 const cups=run.cups.map(cup=>!cup.closed?cup:{...cup,matches:unpack(cup.matches)});
 const {archiveFormat,...rest}=run;
 return {...rest,competitions,cups};
}
