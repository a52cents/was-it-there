import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AssetManager } from '../../src/world/assets/AssetManager';
import type { GlbAssetLoader } from '../../src/world/assets/GlbAssetLoader';

interface SourceAsset {
  readonly root: THREE.Group;
  readonly geometry: THREE.BoxGeometry;
  readonly material: THREE.MeshStandardMaterial;
  readonly texture: THREE.Texture;
}

function createSourceAsset(): SourceAsset {
  const root = new THREE.Group();
  root.name = 'GLTF_Source';
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({
    color: 0x336699,
    map: texture,
  });
  material.name = 'MAT_Test';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'PROP_Test';
  root.add(mesh);
  return { root, geometry, material, texture };
}

function getMesh(root: THREE.Object3D): THREE.Mesh {
  const mesh = root.getObjectByName('PROP_Test') as THREE.Mesh | undefined;

  if (mesh === undefined) {
    throw new Error('Expected PROP_Test mesh.');
  }

  return mesh;
}

describe('AssetManager', () => {
  it('coalesces loads, shares immutable data, and isolates instance materials', async () => {
    const source = createSourceAsset();
    const load = vi.fn(() => Promise.resolve(source.root));
    const manager = new AssetManager({ load } satisfies GlbAssetLoader);

    const [first, second] = await Promise.all([
      manager.acquire({ id: 'bed', url: '/bed.glb' }),
      manager.acquire({ id: 'bed', url: '/bed.glb' }),
    ]);
    const firstMesh = getMesh(first.root);
    const secondMesh = getMesh(second.root);

    expect(load).toHaveBeenCalledOnce();
    expect(first.root).not.toBe(second.root);
    expect(firstMesh.geometry).toBe(source.geometry);
    expect(secondMesh.geometry).toBe(source.geometry);
    expect(firstMesh.material).not.toBe(source.material);
    expect(secondMesh.material).not.toBe(source.material);
    expect(firstMesh.material).not.toBe(secondMesh.material);
    expect((firstMesh.material as THREE.MeshStandardMaterial).map).toBe(
      source.texture,
    );
    expect(manager.getReferenceCount('bed')).toBe(2);

    (firstMesh.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    expect(
      (secondMesh.material as THREE.MeshStandardMaterial).color.getHex(),
    ).toBe(0x336699);

    first.release();
    expect(manager.getReferenceCount('bed')).toBe(1);
    second.release();
    expect(manager.getReferenceCount('bed')).toBe(0);
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  it('disposes instance materials and shared source resources exactly once', async () => {
    const source = createSourceAsset();
    const manager = new AssetManager({
      load: () => Promise.resolve(source.root),
    });
    const disposeGeometry = vi.spyOn(source.geometry, 'dispose');
    const disposeSourceMaterial = vi.spyOn(source.material, 'dispose');
    const disposeTexture = vi.spyOn(source.texture, 'dispose');
    const lease = await manager.acquire({ id: 'chair', url: '/chair.glb' });
    const instanceMaterial = getMesh(lease.root).material as THREE.Material;
    const disposeInstanceMaterial = vi.spyOn(instanceMaterial, 'dispose');

    lease.release();
    lease.release();

    expect(lease.isReleased()).toBe(true);
    expect(disposeInstanceMaterial).toHaveBeenCalledOnce();
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeSourceMaterial).toHaveBeenCalledOnce();
    expect(disposeTexture).toHaveBeenCalledOnce();
  });

  it('reloads a fresh source after the last reference is released', async () => {
    const load = vi.fn(() => Promise.resolve(createSourceAsset().root));
    const manager = new AssetManager({ load });
    const first = await manager.acquire({ id: 'lamp', url: '/lamp.glb' });
    first.release();

    const second = await manager.acquire({ id: 'lamp', url: '/lamp.glb' });

    expect(load).toHaveBeenCalledTimes(2);
    second.release();
  });

  it('rejects one stable id mapped to two different URLs', async () => {
    const manager = new AssetManager({
      load: () => Promise.resolve(createSourceAsset().root),
    });
    const lease = await manager.acquire({ id: 'television', url: '/tv-a.glb' });

    await expect(
      manager.acquire({ id: 'television', url: '/tv-b.glb' }),
    ).rejects.toThrow(
      'Asset id "television" is already associated with "/tv-a.glb", not "/tv-b.glb".',
    );
    lease.release();
  });

  it('reports load context and allows a retry after failure', async () => {
    const load = vi.fn<GlbAssetLoader['load']>();
    load.mockRejectedValueOnce(new Error('network unavailable'));
    load.mockResolvedValueOnce(createSourceAsset().root);
    const manager = new AssetManager({ load });

    await expect(
      manager.acquire({ id: 'wardrobe', url: '/wardrobe.glb' }),
    ).rejects.toThrow(
      'Asset "wardrobe" could not be loaded from "/wardrobe.glb": network unavailable',
    );
    expect(manager.getCachedAssetCount()).toBe(0);

    const lease = await manager.acquire({
      id: 'wardrobe',
      url: '/wardrobe.glb',
    });
    expect(load).toHaveBeenCalledTimes(2);
    lease.release();
  });

  it('rejects empty stable ids and URLs before loading', async () => {
    const load = vi.fn(() => Promise.resolve(createSourceAsset().root));
    const manager = new AssetManager({ load });

    await expect(manager.acquire({ id: ' ', url: '/asset.glb' })).rejects.toThrow(
      'A GLB asset must have a non-empty stable id.',
    );
    await expect(manager.acquire({ id: 'asset', url: ' ' })).rejects.toThrow(
      'Asset "asset" must have a non-empty URL.',
    );
    expect(load).not.toHaveBeenCalled();
  });
});
