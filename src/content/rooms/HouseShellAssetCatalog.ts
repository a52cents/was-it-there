import interiorDoorUrl from '../../assets/models/house-shell/interior-door.glb?url';
import windowLargeUrl from '../../assets/models/house-shell/window-large.glb?url';
import windowSmallUrl from '../../assets/models/house-shell/window-small.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';

export const HOUSE_SHELL_ASSET_CATALOG = {
  interiorDoor: {
    id: 'house-shell/interior-door',
    url: interiorDoorUrl,
  },
  windowLarge: {
    id: 'house-shell/window-large',
    url: windowLargeUrl,
  },
  windowSmall: {
    id: 'house-shell/window-small',
    url: windowSmallUrl,
  },
} as const satisfies Record<string, GlbAssetDefinition>;
