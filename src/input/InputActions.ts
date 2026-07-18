export const INPUT_ACTIONS = [
  'move-forward',
  'move-backward',
  'move-left',
  'move-right',
  'move-fast',
  'interact',
  'pause',
  'toggle-debug',
] as const;

export type InputAction = (typeof INPUT_ACTIONS)[number];
