import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('reddit/i18n/missing-narrative.json','utf8'));
const start=Number(process.argv[2]??0),count=Number(process.argv[3]??100);
console.log(rows.slice(start,start+count).map(row=>JSON.stringify(row)).join('\n'));
