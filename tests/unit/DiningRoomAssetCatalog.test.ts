import { describe, expect, it } from 'vitest';
import { DINING_ROOM_ASSET_CATALOG } from '../../src/content/rooms/DiningRoomAssetCatalog';

describe('DINING_ROOM_ASSET_CATALOG', () => {
  it('maps the local Kenney dining selection to unique stable ids and URLs', () => {
    const assets = Object.values(DINING_ROOM_ASSET_CATALOG);

    expect(assets).toHaveLength(10);
    expect(new Set(assets.map(({ id }) => id)).size).toBe(assets.length);
    expect(new Set(assets.map(({ url }) => url)).size).toBe(assets.length);
    expect(assets.every(({ id }) => id.startsWith('dining-room/'))).toBe(true);
    expect(assets.every(({ url }) => url.includes('.glb'))).toBe(true);
  });
});
