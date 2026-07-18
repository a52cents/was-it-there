import bathroomCollectionUrl from '../../assets/models/bathroom/bathroom-collection.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';

export const BATHROOM_ASSET_CATALOG = {
  collection: {
    id: 'bathroom/tiny-treats-collection',
    url: bathroomCollectionUrl,
  },
} as const satisfies Record<string, GlbAssetDefinition>;

export const BATHROOM_COLLECTION_NODE_NAMES = {
  bathMat: 'mat',
  bathtub: 'bath',
  bin: 'bin',
  candle: 'candle',
  mirror: 'mirror',
  plant: 'plant',
  rubberDuck: 'ducky',
  slippers: 'slippers',
  soapDish: 'soap_dish_blue',
  toiletRollHolder: 'toilet_roll_holder',
  toiletRolls: 'toilet_roll_stack',
  toilet: 'toilet',
  toothbrushCup: 'toothbrush_cup_decorated',
  towelBlue: 'towel_blue',
  towelsStacked: 'towel_stacked',
  vanity: 'cabinet_bathroom',
  wallShelf: 'wall_shelf',
} as const;
