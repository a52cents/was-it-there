import { describe, expect, it } from 'vitest';
import { LAUNDRY_ROOM_ASSET_CATALOG } from '../../src/content/rooms/LaundryRoomAssetCatalog';

describe('LAUNDRY_ROOM_ASSET_CATALOG', () => {
  it('adds one local washer and reuses five existing house props', () => {
    const assets = Object.values(LAUNDRY_ROOM_ASSET_CATALOG);

    expect(assets).toHaveLength(6);
    expect(new Set(assets.map(({ id }) => id)).size).toBe(assets.length);
    expect(
      assets.filter(({ id }) => id.startsWith('laundry-room/')),
    ).toHaveLength(1);
    expect(assets.every(({ url }) => url.includes('.glb'))).toBe(true);
  });
});
