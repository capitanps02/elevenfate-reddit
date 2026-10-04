import test from 'node:test';
import assert from 'node:assert/strict';
import {createGamePost} from '../server/create-post.mjs';

test('anonymous, ordinary users and moderators without post permission cannot create game posts',async()=>{
  let created=0;
  const reddit={getModerators:()=>({all:async()=>[{id:'t2_config',moderatorInfo:{modPermissions:['config']}}]}),submitCustomPost:async()=>{created++;}};
  for(const [userId,status] of [[undefined,401],['t2_player',403],['t2_config',403]]){
    await assert.rejects(createGamePost({context:{userId,subredditName:'elevenfate'},reddit}),error=>error.status===status);
  }
  assert.equal(created,0);
});
test('authorized moderators can create posts only in the trusted context community',async()=>{
  for(const permission of ['all','posts']){
    const reddit={getModerators:({subredditName})=>{assert.equal(subredditName,'ElevenFate');return{all:async()=>[{id:'t2_mod',moderatorInfo:{modPermissions:[permission]}}]};},submitCustomPost:async options=>{assert.deepEqual(options,{subredditName:'ElevenFate',title:'ElevenFate · Tu carrera. Tus decisiones. Tu legado.',entry:'default'});return{url:'https://www.reddit.com/r/ElevenFate/comments/example'};}};
    assert.ok((await createGamePost({context:{userId:'t2_mod',subredditName:'ElevenFate'},reddit})).url);
  }
});
