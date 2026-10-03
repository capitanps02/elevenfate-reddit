import fs from 'node:fs';import {simulateCareer} from '../dist/simulation/career-simulator.js';
import {assertGameState} from '../dist/save/validation.js';
const seed=Number(process.argv[2]),days=Number(process.argv[3]),file=process.argv[4],start=Date.now();
const full=days===14000,result=simulateCareer({seed,days,untilRetirement:full,maxAge:55,microfeeds:true}),state=result.state;
assertGameState(state);
const issues=[];
function inspect(value,key='state'){if(typeof value==='number'&&!Number.isFinite(value))issues.push('non-finite:'+key);else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))inspect(v,key+'.'+k);}
inspect(state);
if(state.age<18||state.age>55)issues.push('age-outside-bounds');
if(Number(state.contract.monthsRemaining)<0||Number(state.contract.salaryMonthly)<0)issues.push('negative-contract');
if(state.retirement.status==='closed'&&state.market?.pending)issues.push('pending-offer-after-retirement');
const report={start:seed,count:1,days,ms:Date.now()-start,blocked:full&&state.retirement.status!=='closed'?1:0,ages:{[state.age]:1},closures:{[state.retirement.closureType]:1},invariantIssues:issues};
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
