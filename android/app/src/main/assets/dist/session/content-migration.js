/** Synchronous compatibility facade for migration tooling. Loaded on demand by gameplay. */
export * from "./content-migration-core.js";
import { registerLegacyContentSources } from "./content-migration-core.js";
import { PRE_T51_CONTENT_IDENTITY, PRE_T51_EVENT_EVIDENCE } from "./pre-t51-legacy-registry.js";
import { POST_T51_CONTENT_SOURCES } from "./post-t51-legacy-registry.js";
import { PRE_T41_CONTENT_IDENTITY, PRE_T41_EVENT_EVIDENCE } from "./pre-t41-legacy-registry.js";
import { FROZEN_OFFER_BRIDGE_SOURCES } from "./frozen-offer-bridge-evidence.js";
const postLegacySourcesWithBridgeEvidence = Object.fromEntries(Object.entries(POST_T51_CONTENT_SOURCES).map(([identity, source]) => [identity, {
        ...source,
        offerBridges: FROZEN_OFFER_BRIDGE_SOURCES[identity] ?? {}
    }]));
/** Validation-only historical catalogs. They never join EventIndex or scheduling. */
const sources = {
    // Historical decisions may retain this provenance after a later migration.
    // Register exact evidence, without aliasing catalogs or adding migration routes.
    [PRE_T41_CONTENT_IDENTITY]: {
        contentIdentity: PRE_T41_CONTENT_IDENTITY,
        engineBuild: "0.8.0-t2.5",
        sessionVersions: [1, 2, 3],
        events: PRE_T41_EVENT_EVIDENCE
    },
    [PRE_T51_CONTENT_IDENTITY]: {
        contentIdentity: PRE_T51_CONTENT_IDENTITY,
        engineBuild: "0.8.0-t2.5",
        sessionVersions: [1, 2, 3],
        events: PRE_T51_EVENT_EVIDENCE,
        offerBridges: FROZEN_OFFER_BRIDGE_SOURCES[PRE_T51_CONTENT_IDENTITY] ?? {}
    },
    ...postLegacySourcesWithBridgeEvidence
};
registerLegacyContentSources(sources);
