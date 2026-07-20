import washingMachineUrl from '../../assets/models/laundry-room/prop-washing-machine.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';
import { CORRIDOR_ASSET_CATALOG } from './CorridorAssetCatalog';
import { KITCHEN_ASSET_CATALOG } from './KitchenAssetCatalog';
import { LIVING_ROOM_ASSET_CATALOG } from './LivingRoomAssetCatalog';

export const LAUNDRY_ROOM_ASSET_CATALOG = {
  washingMachine: {
    id: 'laundry-room/washing-machine',
    url: washingMachineUrl,
  },
  disposalBin: KITCHEN_ASSET_CATALOG.trashcan,
  utilityCabinet: KITCHEN_ASSET_CATALOG.cabinet,
  storageShelf: LIVING_ROOM_ASSET_CATALOG.shelfLarge,
  foldingBench: CORRIDOR_ASSET_CATALOG.bench,
  runnerRug: CORRIDOR_ASSET_CATALOG.runnerRug,
} as const satisfies Record<string, GlbAssetDefinition>;
