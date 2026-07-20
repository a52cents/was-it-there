export const LEVEL_BUILDER_SNAP_PRESETS = {
  off: {
    translation: null,
    rotationDegrees: null,
    scale: null,
  },
  fine: {
    translation: 0.01,
    rotationDegrees: 1,
    scale: 0.01,
  },
  normal: {
    translation: 0.05,
    rotationDegrees: 5,
    scale: 0.05,
  },
  coarse: {
    translation: 0.25,
    rotationDegrees: 15,
    scale: 0.1,
  },
} as const;

export type LevelBuilderSnapPreset = keyof typeof LEVEL_BUILDER_SNAP_PRESETS;
