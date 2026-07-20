import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createAmbientSkyTexture } from '../../src/rendering/SceneAmbience';

describe('createAmbientSkyTexture', () => {
  it('creates a reusable equirectangular night gradient', () => {
    const texture = createAmbientSkyTexture();
    const data = texture.image.data as Uint8Array;
    const rowLength = texture.image.width * 4;
    const firstRow = [...data.slice(0, rowLength)];
    const horizonRowStart = Math.floor(texture.image.height * 0.58) * rowLength;
    const horizonRow = [
      ...data.slice(horizonRowStart, horizonRowStart + rowLength),
    ];

    expect(texture.name).toBe('TEXTURE_AmbientNightSky');
    expect(texture.image.width).toBe(128);
    expect(texture.image.height).toBe(64);
    expect(texture.mapping).toBe(THREE.EquirectangularReflectionMapping);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(horizonRow).not.toEqual(firstRow);

    const dispose = vi.spyOn(texture, 'dispose');
    texture.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
