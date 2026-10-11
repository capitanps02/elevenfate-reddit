import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=lang=>JSON.parse(readFileSync(new URL('../i18n/'+lang+'.json',import.meta.url),'utf8'));
const es=read('es'),en=read('en');
test('Spanish and English drafts have one-to-one keys and translated content',()=>{
  for(const key of ['ui','stages','fallbackEvents','fallbackChoices','server']){
    assert.deepEqual(Object.keys(en[key]).sort(),Object.keys(es[key]).sort());
  }
  assert.equal(Object.keys(en.fallbackEvents).length,24);
  assert.equal(Object.keys(en.fallbackChoices).length,12);
  assert.equal(Object.keys(en.stages).length,6);
  assert.equal(es.status,'translation-draft-not-runtime-enabled');
  assert.equal(en.status,es.status);
  const p=s=>(s.match(new RegExp('[{][a-zA-Z]+[}]','g'))||[]).sort();
  for(const section of ['ui','server'])for(const key of Object.keys(es[section])){
    assert.ok(es[section][key].length&&en[section][key].length,section+'.'+key);
    assert.deepEqual(p(es[section][key]),p(en[section][key]),section+'.'+key);
  }
  for(const [id,data] of Object.entries(en.fallbackEvents)){
    assert.match(id,/^DAILY_[0-5]_[0-3]$/);
    assert.ok(data.title?.trim()&&data.body?.trim());
    assert.ok(es.fallbackEvents[id]?.title&&es.fallbackEvents[id]?.body);
  }
});
