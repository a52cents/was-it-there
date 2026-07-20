import { describe, expect, it } from 'vitest';
import {
  createStoneTileFloorTexture,
  createWoodPlankFloorTexture,
} from '../../src/world/textures/ProceduralFloorTexture';

const countRgbColors = (textureData: Uint8Array): number => {
  const colors = new Set<string>();

  for (let index = 0; index < textureData.length; index += 4) {
    colors.add(
      `${textureData[index]}:${textureData[index + 1]}:${textureData[index + 2]}`,
    );
  }

  return colors.size;
};

describe('ProceduralFloorTexture', () => {
  it('creates staggered wood with enough variation to avoid a linear pattern', () => {
    const texture = createWoodPlankFloorTexture({
      name: 'TEST_Wood',
      seed: 17,
      repeat: [2, 3],
      plankColors: ['#92785d', '#7c654f', '#9b8062'],
      seamColor: '#514137',
    });
    const data = texture.image.data as Uint8Array;

    expect(texture.name).toBe('TEST_Wood');
    expect(texture.repeat.toArray()).toEqual([2, 3]);
    expect(countRgbColors(data)).toBeGreaterThan(40);
    texture.dispose();
  });

  it('creates individually varied tiles instead of a flat checkerboard', () => {
    const texture = createStoneTileFloorTexture({
      name: 'TEST_Tile',
      seed: 23,
      repeat: [4, 4],
      tileColors: ['#a99a89', '#9c8e7e', '#948575'],
      groutColor: '#625a52',
    });
    const data = texture.image.data as Uint8Array;

    expect(texture.name).toBe('TEST_Tile');
    expect(texture.repeat.toArray()).toEqual([4, 4]);
    expect(countRgbColors(data)).toBeGreaterThan(30);
    texture.dispose();
  });
});
