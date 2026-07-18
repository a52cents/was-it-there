import { describe, expect, it } from 'vitest';
import { BEDROOM_ASSET_CATALOG } from '../../src/content/rooms/BedroomAssetCatalog';

describe('BEDROOM_ASSET_CATALOG', () => {
  it('maps all curated bedroom GLBs to unique stable ids and URLs', () => {
    const assets = Object.values(BEDROOM_ASSET_CATALOG);

    expect(assets).toHaveLength(16);
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);
    expect(new Set(assets.map((asset) => asset.url)).size).toBe(assets.length);
    expect(assets.every((asset) => asset.id.startsWith('bedroom/'))).toBe(true);
    expect(
      assets.every((asset) => asset.url.includes('.glb')),
    ).toBe(true);
  });
});
