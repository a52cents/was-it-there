import chandelierUrl from '../../assets/models/living-room/prop-chandelier.glb?url';
import curtainsDoubleUrl from '../../assets/models/living-room/prop-curtains-double.glb?url';
import fireplaceUrl from '../../assets/models/living-room/prop-fireplace.glb?url';
import lCouchUrl from '../../assets/models/living-room/prop-l-couch.glb?url';
import rugRoundUrl from '../../assets/models/living-room/prop-rug-round.glb?url';
import shelfLargeUrl from '../../assets/models/living-room/prop-shelf-large.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';
import { BEDROOM_ASSET_CATALOG } from './BedroomAssetCatalog';
import { CORRIDOR_ASSET_CATALOG } from './CorridorAssetCatalog';
import { DINING_ROOM_ASSET_CATALOG } from './DiningRoomAssetCatalog';

export const LIVING_ROOM_ASSET_CATALOG = {
  chandelier: { id: 'living-room/chandelier', url: chandelierUrl },
  curtainsDouble: {
    id: 'living-room/curtains-double',
    url: curtainsDoubleUrl,
  },
  fireplace: { id: 'living-room/fireplace', url: fireplaceUrl },
  lCouch: { id: 'living-room/l-couch', url: lCouchUrl },
  rugRound: { id: 'living-room/rug-round', url: rugRoundUrl },
  shelfLarge: { id: 'living-room/shelf-large', url: shelfLargeUrl },
  floorLamp: DINING_ROOM_ASSET_CATALOG.floorLampSquare,
  glassTable: DINING_ROOM_ASSET_CATALOG.glassSideTable,
  loungeChair: DINING_ROOM_ASSET_CATALOG.loungeChairRelax,
  photoFrame: BEDROOM_ASSET_CATALOG.photoFrame,
  radio: BEDROOM_ASSET_CATALOG.radio,
  television: BEDROOM_ASSET_CATALOG.television,
  tvCabinet: BEDROOM_ASSET_CATALOG.tvCabinet,
  pottedPlant: CORRIDOR_ASSET_CATALOG.pottedPlant,
} as const satisfies Record<string, GlbAssetDefinition>;
