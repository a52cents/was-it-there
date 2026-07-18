export const GAME_TIMING_CONFIG = {
  observationDurationMs: 10_000,
  searchDurationMs: 30_000,
  penalties: {
    incorrectReport: 5_000,
    timeout: 15_000,
    hint: 10_000,
  },
} as const;

export type RunPenaltyKind = keyof typeof GAME_TIMING_CONFIG.penalties;
