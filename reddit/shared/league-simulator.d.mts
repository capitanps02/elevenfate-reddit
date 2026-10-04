import type {GameState} from '../../src/core/types.js';
import type {ScheduledFixture,MatchResultFact} from '../../src/simulation/match-model.js';
export function careerCompetitionFixture(state:GameState,date:string):{fixture:ScheduledFixture;result:MatchResultFact}|null;
export function careerLeagueOutcome(state:GameState):'relegated'|'playoff'|'safe';
