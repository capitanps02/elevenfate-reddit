export declare const PLAYER_ID: "PLR_001";
export declare const LEGACY_PLAYER_DISPLAY_NAME = "Jugador";
export declare const PLAYER_DISPLAY_NAME_MIN_GRAPHEMES = 2;
export declare const PLAYER_DISPLAY_NAME_MAX_GRAPHEMES = 32;
export interface PlayerIdentity {
    id: typeof PLAYER_ID;
    displayName: string;
}
export declare function playerDisplayNameGraphemeCount(value: string): number;
export declare function normalizePlayerDisplayName(value: unknown): string | null;
export declare function makePlayerIdentity(displayName?: unknown): PlayerIdentity;
export declare function inspectPlayerIdentity(value: unknown): string | null;
/**
 * Historical saves/snapshots may omit identity because schema 8 predates ID-01.
 * Upgrade is deterministic, consumes no RNG and never overwrites a persisted identity.
 */
export declare function ensurePlayerIdentityInPlace(state: unknown): PlayerIdentity;
