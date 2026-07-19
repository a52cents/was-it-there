import { BEDROOM_ASSET_CATALOG } from './BedroomAssetCatalog';
import { CORRIDOR_ASSET_CATALOG } from './CorridorAssetCatalog';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';

export const OFFICE_ASSET_CATALOG = {
  armchair: BEDROOM_ASSET_CATALOG.chairCushion,
  bookcase: BEDROOM_ASSET_CATALOG.bookcaseLow,
  books: BEDROOM_ASSET_CATALOG.booksStack,
  cabinet: BEDROOM_ASSET_CATALOG.nightstand,
  desk: CORRIDOR_ASSET_CATALOG.console,
  deskLamp: BEDROOM_ASSET_CATALOG.tableLamp,
  filingCabinet: BEDROOM_ASSET_CATALOG.wardrobe,
  frameLarge: BEDROOM_ASSET_CATALOG.pictureFrame,
  frameSmall: BEDROOM_ASSET_CATALOG.photoFrame,
  officeChair: BEDROOM_ASSET_CATALOG.chairCushion,
  officePhone: CORRIDOR_ASSET_CATALOG.officePhone,
  parcel: CORRIDOR_ASSET_CATALOG.parcelClosed,
  plant: CORRIDOR_ASSET_CATALOG.pottedPlant,
  radio: BEDROOM_ASSET_CATALOG.radio,
  rug: BEDROOM_ASSET_CATALOG.rugRectangle,
  speaker: CORRIDOR_ASSET_CATALOG.smallSpeaker,
  wallClock: CORRIDOR_ASSET_CATALOG.wallClock,
} as const satisfies Record<string, GlbAssetDefinition>;
