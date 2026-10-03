import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const cli=path.resolve(fs.realpathSync('node_modules/devvit'),'../@devvit/cli/dist/util/project.js');
const {Project}=await import(pathToFileURL(cli));
await Project.new(process.cwd(),'devvit.json','Static');
console.log('Devvit config validated by installed CLI; client and server entries exist.');
