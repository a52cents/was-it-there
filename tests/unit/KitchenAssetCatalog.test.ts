import { describe, expect, it } from 'vitest';
import { KITCHEN_ASSET_CATALOG } from '../../src/content/rooms/KitchenAssetCatalog';

describe('KITCHEN_ASSET_CATALOG', () => {
  it('maps the local Kenney kitchen selection to unique stable ids and URLs', () => {
    const assets = Object.values(KITCHEN_ASSET_CATALOG);

    expect(assets).toHaveLength(19);
    expect(new Set(assets.map(({ id }) => id)).size).toBe(assets.length);
    expect(new Set(assets.map(({ url }) => url)).size).toBe(assets.length);
    expect(assets.every(({ id }) => id.startsWith('kitchen/'))).toBe(true);
    expect(assets.every(({ url }) => url.includes('.glb'))).toBe(true);
  });
});
