import { describe, expect, it } from 'vitest';
import {
  BATHROOM_ASSET_CATALOG,
  BATHROOM_COLLECTION_NODE_NAMES,
} from '../../src/content/rooms/BathroomAssetCatalog';

describe('BATHROOM_ASSET_CATALOG', () => {
  it('uses one stable GLB collection with one unique node per prop', () => {
    expect(BATHROOM_ASSET_CATALOG.collection.id).toBe(
      'bathroom/tiny-treats-collection',
    );
    expect(BATHROOM_ASSET_CATALOG.collection.url).toContain('.glb');
    const nodeNames = Object.values(BATHROOM_COLLECTION_NODE_NAMES);
    expect(nodeNames).toHaveLength(17);
    expect(new Set(nodeNames).size).toBe(nodeNames.length);
  });
});
