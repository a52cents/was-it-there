import type {
  AnomalyPlan,
  ImplementedAnomalyKind,
} from './AnomalyGenerator';
import type { GameMode } from '../run/GameMode';
import {
  RESTORE_CANONICAL_COLORS_VARIANT_ID,
  RESTORE_CANONICAL_ROTATION_VARIANT_ID,
} from './AnomalyTarget';

export interface AnomalyRevealCopy {
  readonly targetId: string;
  readonly targetLabel: string;
  readonly changeLabel: string;
}

const TARGET_LABELS: Readonly<Record<string, string>> = {
  television: 'TELEVISION',
  chair: 'CHAIR',
  plant: 'PLANT',
  picture: 'WALL PICTURE',
  lamp: 'TABLE LAMP',
  books: 'BOOKS',
  bed: 'BED',
  wardrobe: 'WARDROBE',
  nightstand: 'NIGHTSTAND',
  'tv-cabinet': 'TV CABINET',
  rug: 'RUG',
  bookcase: 'BOOKCASE',
  radio: 'RADIO',
  'photo-frame': 'PHOTO FRAME',
  'bath-mat': 'BATH MAT',
  bathtub: 'BATHTUB',
  bin: 'WASTE BIN',
  candle: 'CANDLE',
  mirror: 'MIRROR',
  'rubber-duck': 'RUBBER DUCK',
  slippers: 'SLIPPERS',
  'soap-dish': 'SOAP DISH',
  toilet: 'TOILET',
  'toilet-roll-holder': 'TOILET ROLL HOLDER',
  'toilet-rolls': 'TOILET ROLLS',
  'toothbrush-cup': 'TOOTHBRUSH CUP',
  towel: 'TOWEL',
  'towels-stacked': 'STACKED TOWELS',
  vanity: 'VANITY',
  'wall-shelf': 'WALL SHELF',
  'archive-box': 'ARCHIVE BOX',
  'bay-armchair': 'READING CHAIR',
  'bay-plant': 'BAY PLANT',
  'bay-rug': 'BAY RUG',
  'desk-lamp': 'DESK LAMP',
  'desk-photo': 'DESK PHOTO',
  desk: 'DESK',
  'drawer-cabinet': 'DRAWER CABINET',
  'filing-cabinet': 'FILING CABINET',
  'frame-east': 'EAST PICTURE',
  'frame-west': 'WEST PICTURE',
  'office-chair': 'OFFICE CHAIR',
  'office-phone': 'OFFICE PHONE',
  speaker: 'SPEAKER',
  'wall-clock': 'WALL CLOCK',
};

const CHANGE_LABELS: Readonly<Record<ImplementedAnomalyKind, string>> = {
  hide: 'IT DISAPPEARED',
  show: 'IT APPEARED',
  move: 'IT MOVED',
  rotate: 'ITS ORIENTATION CHANGED',
  scale: 'ITS SIZE CHANGED',
  color: 'ITS COLOR CHANGED',
};

export function describeFirstAnomaly(
  plan: AnomalyPlan | null,
): AnomalyRevealCopy | null {
  const anomaly = plan?.anomalies[0];

  if (anomaly === undefined) {
    return null;
  }

  return {
    targetId: anomaly.targetId,
    targetLabel:
      TARGET_LABELS[anomaly.targetId] ?? formatTargetId(anomaly.targetId),
    changeLabel:
      anomaly.kind === 'color' &&
      anomaly.variantId === RESTORE_CANONICAL_COLORS_VARIANT_ID
        ? 'ITS ORIGINAL COLOR RETURNED'
        : anomaly.kind === 'rotate' &&
            anomaly.variantId === RESTORE_CANONICAL_ROTATION_VARIANT_ID
          ? 'ITS ORIGINAL ORIENTATION RETURNED'
        : CHANGE_LABELS[anomaly.kind],
  };
}

export function describeMissedAnomalyForMode(
  mode: GameMode,
  plan: AnomalyPlan | null,
): AnomalyRevealCopy | null {
  return mode === 'escape' ? describeFirstAnomaly(plan) : null;
}

function formatTargetId(targetId: string): string {
  return targetId.replaceAll('-', ' ').toUpperCase();
}
