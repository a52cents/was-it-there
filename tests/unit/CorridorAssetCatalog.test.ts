import { describe, expect, it } from 'vitest';
import { CORRIDOR_ASSET_CATALOG } from '../../src/content/rooms/CorridorAssetCatalog';

describe('CORRIDOR_ASSET_CATALOG', () => {
  it('declares sixteen stable GLB assets with unique ids', () => {
    const assets = Object.values(CORRIDOR_ASSET_CATALOG);

    expect(assets).toHaveLength(16);
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);

    for (const asset of assets) {
      expect(asset.id).toMatch(/^first-corridor\//u);
      expect(asset.url).toContain('.glb');
    }
  });
});
