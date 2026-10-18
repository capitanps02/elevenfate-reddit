import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FOOTBALL_CLUBS, FOOTBALL_DIVISIONS, footballClubBalanceMetadata} from '../dist/catalog/football/index.js';

const baseline = JSON.parse(readFileSync(new URL('../docs/qa/catalogo-perfiles/baseline.json', import.meta.url), 'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('descriptive calibration preserves every club resource, identity and division', () => {
  const clubs = FOOTBALL_CLUBS.map(({archetypes, ...club}) => club);
  assert.equal(hash({clubs, divisions: FOOTBALL_DIVISIONS}), baseline.structuralHash);
});

test('descriptive calibration preserves every runtime selector profile and band', () => {
  const profiles = FOOTBALL_CLUBS.map(club => [club.id, footballClubBalanceMetadata(
    club, FOOTBALL_DIVISIONS.find(division => division.id === club.divisionId)
  )]);
  assert.equal(hash(profiles), baseline.selectorHash);
});

test('hierarchy retains specialized lower-division academies rather than flattening them', () => {
  const first = FOOTBALL_CLUBS.filter(club => club.divisionId === 'ESP_D1');
  const second = FOOTBALL_CLUBS.filter(club => club.divisionId === 'ESP_D2');
  assert.ok(Math.max(...second.map(club => club.youthQuality)) > Math.min(...first.map(club => club.youthQuality)));
});
