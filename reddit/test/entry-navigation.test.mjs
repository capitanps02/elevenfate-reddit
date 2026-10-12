import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntryNavigation} from '../client/entry-navigation.mjs';
function fakeWindow(){
 const listeners=new Set(),entries=[null];let index=0;
 const history={get state(){return entries[index];},pushState(state){entries.splice(index+1);entries.push(state);index++;},replaceState(state){entries[index]=state;},back(){if(index>0){index--;for(const listener of [...listeners])listener({state:history.state});}},forward(){if(index<entries.length-1){index++;for(const listener of [...listeners])listener({state:history.state});}}};
 return {history,listeners,addEventListener(name,fn){assert.equal(name,'popstate');listeners.add(fn);},removeEventListener(name,fn){listeners.delete(fn);}};
}
test('Back from career returns to cover; Forward restores requested career entry',()=>{
 const win=fakeWindow(),routes=[];const nav=createEntryNavigation({window:win,onRoute:(r,s)=>routes.push([r,s.mhView])});
 nav.enter('cover',{push:false});nav.enter('career',{context:{mhView:'new'}});win.history.back();assert.deepEqual(routes,[['cover',undefined]]);
 win.history.forward();assert.deepEqual(routes,[['cover',undefined],['career','new']]);nav.dispose();assert.equal(win.listeners.size,0);
});
test('busy save blocks leaving and restores current career state',()=>{
 const win=fakeWindow(),routes=[];let busy=true;
 const state={efEntry:'career',mhOwner:true,mhView:'new',mhCinematic:false};
 const nav=createEntryNavigation({window:win,onRoute:r=>routes.push(r),canLeave:()=>!busy,captureState:()=>state});
 nav.enter('cover',{push:false});nav.enter('career');win.history.back();assert.deepEqual(routes,[]);assert.deepEqual(win.history.state,state);
 busy=false;win.history.back();assert.deepEqual(routes,['cover']);nav.dispose();
});
test('Back from Daily restores career origin without remounting internal career navigation',()=>{
 const win=fakeWindow(),routes=[];const nav=createEntryNavigation({window:win,onRoute:r=>routes.push(r)});
 nav.enter('cover',{push:false});nav.enter('career',{context:{mhView:'home'}});win.history.pushState({efEntry:'career',mhView:'profile'},'');win.history.back();assert.deepEqual(routes,[]);
 nav.enter('daily',{context:{origin:'career'}});nav.back('career');assert.deepEqual(routes,['career']);nav.dispose();
});
test('Daily write blocks Back until its response is confirmed',()=>{
 const win=fakeWindow(),routes=[];let busy=true;const nav=createEntryNavigation({window:win,onRoute:r=>routes.push(r),canLeave:()=>!busy});
 nav.enter('cover',{push:false});nav.enter('daily',{context:{origin:'cover'}});win.history.back();assert.deepEqual(routes,[]);assert.equal(win.history.state.efEntry,'daily');
 busy=false;nav.back('cover');assert.deepEqual(routes,['cover']);nav.dispose();
});
test('unowned states are ignored and unsupported Back uses the stated origin',()=>{
 const win=fakeWindow(),routes=[];const nav=createEntryNavigation({window:win,onRoute:r=>routes.push(r)});nav.enter('cover',{push:false});win.history.pushState({external:true},'');win.history.back();routes.length=0;
 win.history.back=undefined;nav.back('cover');assert.deepEqual(routes,['cover']);nav.dispose();
});
