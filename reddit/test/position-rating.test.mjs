import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../../dist/content/initial-state.js';
import {balancedPlayerStatsForFixture} from '../../dist/simulation/match-model.js';
import {defensiveResultAdjustment as adjust, positionAwarePlayerStatsForFixture as produce} from '../shared/position-rating.mjs';

test('experimental defensive context follows score and exposure without rewarding attacking positions', () => {
  for (const position of ['goalkeeper','centre_back','full_back','defensive_midfielder']) {
    const values = [0,1,2,3,4,10].map(conceded => adjust(position,90,conceded));
    assert.ok(values[0]>0); assert.ok(values[2]<0);
    for(let i=1;i<values.length;i++) assert.ok(values[i]<=values[i-1]);
    assert.equal(adjust(position,0,0),0);
    assert.ok(Math.abs(adjust(position,15,0)-values[0]/6)<1e-12);
    assert.ok(Math.abs(adjust(position,90,2)-adjust(position,30,2)*3)<1e-12);
  }
  for(const position of ['winger','striker','central_midfielder','attacking_midfielder',undefined]) assert.equal(adjust(position,90,0),0);
  assert.equal(adjust('wing-back',90,0),adjust('full_back',90,0));
  assert.equal(adjust('portero',90,0),adjust('goalkeeper',90,0));
  assert.throws(()=>adjust('goalkeeper',90,NaN));
});

test('experimental producer only changes rating, preserves RNG, direction and missing appearances', () => {
  const state=createInitialState(42),before=structuredClone(state),performance={roleScore:85,form:70,fitness:80,fatigue:12,opponentLevel:65,positionIdentity:'goalkeeper'};
  for(let seed=0;seed<300;seed++)for(const homeAway of ['home','away'])for(const conceded of [0,1,2,5]) {
    const fixture={id:`defence-${seed}`,date:'2026-08-01',season:'2026-27',competition:'league',club:'UDV',opponentClubId:'OTHER',homeAway,official:true};
    const result={homeGoals:homeAway==='home'?1:conceded,awayGoals:homeAway==='away'?1:conceded,outcome:conceded>1?'loss':conceded===1?'draw':'win'};
    for(const minutes of [1,15,60,90]) {
      const fact={appeared:true,started:minutes>=60,minutes},old=balancedPlayerStatsForFixture(state,fixture,fact,result,performance),next=produce(state,fixture,fact,result,performance);
      const {rating:oldRating,...oldFacts}=old,{rating:nextRating,...nextFacts}=next;
      assert.deepEqual(nextFacts,oldFacts);assert.ok(nextRating>=3.5&&nextRating<=10);
      assert.ok(conceded===0?nextRating>=oldRating:conceded>=2?nextRating<=oldRating:true);
    }
    const absent={appeared:false,started:false,minutes:0};
    assert.deepEqual(produce(state,fixture,absent,result,performance),balancedPlayerStatsForFixture(state,fixture,absent,result,performance));
  }
  assert.deepEqual(state,before);
});
