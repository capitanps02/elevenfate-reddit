import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root=path.resolve(import.meta.dirname,'..');
const dirs=['reddit/client','reddit/server','reddit/shared','web','src'];
const files=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(`${dir}/${entry.name}`):[`${dir}/${entry.name}`]);
const spanish=/[áéíóúñ¿¡]|\b(?:el|la|los|las|tu|tus|una|un|del|con|para|por|sin|que|años|partida|carrera|equipo|guardado|jugar|volver|cerrar|datos|temporada|goles|partidos|forma|fatiga|físico|técnica|salario|contrato|inicio|mundo|relaciones|perfil|titular|ayuda|continuar|decisiones|oferta|lesión|práctica|puntos|premios|portero|defensa|extremo)\b/i;
const rows=new Map();
for(const file of dirs.flatMap(files).filter(file=>/\.(?:ts|mjs|js)$/.test(file)&&!file.includes('/i18n/'))){
 const source=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true);
 function visit(node){
  let value;
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))value=node.text;
  if(ts.isTemplateExpression(node))value=node.head.text+node.templateSpans.map((span,i)=>`{${i}}${span.literal.text}`).join('');
  if(value&&spanish.test(value)&&!value.includes('\nimport ')&&value.length<15000){
   const row=rows.get(value)??{es:value,uses:[]};
   const pos=source.getLineAndCharacterOfPosition(node.getStart(source));
   row.uses.push({file,line:pos.line+1,kind:ts.SyntaxKind[node.kind]});rows.set(value,row);
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
}
fs.mkdirSync(path.join(root,'reddit/i18n'),{recursive:true});
fs.writeFileSync(path.join(root,'reddit/i18n/inventory.json'),JSON.stringify([...rows.values()],null,2)+'\n');
console.log(JSON.stringify({strings:rows.size,characters:[...rows.keys()].reduce((n,s)=>n+s.length,0),areas:Object.fromEntries(dirs.map(dir=>[dir,[...rows.values()].filter(row=>row.uses.some(use=>use.file.startsWith(dir+'/'))).length]))}));
