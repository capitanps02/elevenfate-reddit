// Versioned Daily v7 team-result context. It is not an individual clean-sheet,
// save or tackle statistic: the simulator does not record when goals occurred.
import {balancedPlayerStatsForFixture} from '../../dist/simulation/match-model.js';

export function defensiveResultAdjustment(position, minutes, conceded) {
  if (!Number.isFinite(minutes) || !Number.isInteger(conceded) || conceded < 0) throw new Error('Invalid defensive rating context');
  const p = String(position ?? '').toLowerCase();
  const weight = /goal|portero/.test(p) ? .8
    : /(?:full|wing)[_ -]?back|lateral/.test(p) ? .55
    : /defensive_mid|pivote/.test(p) ? .25
    : /centre[_ -]?back|center[_ -]?back|central|defen/.test(p) && !/mid|medio/.test(p) ? .65 : 0;
  const signal = conceded === 0 ? 1 : conceded === 1 ? .2 : conceded === 2 ? -.35 : conceded === 3 ? -.7 : -1;
  return weight * Math.max(0, Math.min(90, minutes)) / 90 * signal;
}

export function positionAwarePlayerStatsForFixture(state, fixture, player, result, performance) {
  const stats = balancedPlayerStatsForFixture(state, fixture, player, result, performance);
  if (!player.appeared) return stats;
  const conceded = fixture.homeAway === 'home' ? result.awayGoals : result.homeGoals;
  const adjustment = defensiveResultAdjustment(performance.positionIdentity, player.minutes, conceded);
  return {...stats, rating: Math.round(Math.max(3.5, Math.min(10, stats.rating + adjustment)) * 10) / 10};
}
