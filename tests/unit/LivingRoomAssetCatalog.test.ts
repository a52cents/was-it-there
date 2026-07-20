import { describe, expect, it } from 'vitest';
import { LIVING_ROOM_ASSET_CATALOG } from '../../src/content/rooms/LivingRoomAssetCatalog';

describe('LIVING_ROOM_ASSET_CATALOG', () => {
  it('combines six unique local salon models with reusable house props', () => {
    const assets = Object.values(LIVING_ROOM_ASSET_CATALOG);

    expect(assets).toHaveLength(14);
    expect(new Set(assets.map(({ id }) => id)).size).toBe(assets.length);
    expect(new Set(assets.map(({ url }) => url)).size).toBe(assets.length);
    expect(
      assets.filter(({ id }) => id.startsWith('living-room/')),
    ).toHaveLength(6);
    expect(assets.every(({ url }) => url.includes('.glb'))).toBe(true);
  });
});
