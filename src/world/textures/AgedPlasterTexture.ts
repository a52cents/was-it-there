import * as THREE from 'three';

interface AgedPlasterTextureOptions {
  readonly name: string;
  readonly seed?: number;
  readonly repeat?: readonly [number, number];
}

const hash = (x: number, y: number, seed: number): number => {
  let value = Math.imul(x, 374_761_393)
    + Math.imul(y, 668_265_263)
    + Math.imul(seed, 69_069);
  value = Math.imul(value ^ (value >>> 13), 1_274_126_177);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_295;
};

const smoothstep = (value: number): number => value * value * (3 - 2 * value);

const valueNoise = (
  x: number,
  y: number,
  scale: number,
  seed: number,
): number => {
  const scaledX = x / scale;
  const scaledY = y / scale;
  const cellX = Math.floor(scaledX);
  const cellY = Math.floor(scaledY);
  const blendX = smoothstep(scaledX - cellX);
  const blendY = smoothstep(scaledY - cellY);
  const top = THREE.MathUtils.lerp(
    hash(cellX, cellY, seed),
    hash(cellX + 1, cellY, seed),
    blendX,
  );
  const bottom = THREE.MathUtils.lerp(
    hash(cellX, cellY + 1, seed),
    hash(cellX + 1, cellY + 1, seed),
    blendX,
  );
  return THREE.MathUtils.lerp(top, bottom, blendY);
};

/**
 * Creates a tiny, deterministic plaster texture with restrained mottling.
 * Its contrast stays deliberately low so separate wall segments do not read as
 * panels and gameplay color changes remain easy to compare.
 */
export const createAgedPlasterTexture = (
  options: AgedPlasterTextureOptions,
): THREE.DataTexture => {
  const width = 128;
  const height = 128;
  const channels = 4;
  const seed = options.seed ?? 1;
  const pixels = new Uint8Array(width * height * channels);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const broad = valueNoise(x, y, 27, seed);
      const mottling = valueNoise(x, y, 8, seed + 31);
      const fine = hash(x, y, seed + 127) - 0.5;
      const shade = THREE.MathUtils.clamp(
        247 + (broad - 0.5) * 6 + (mottling - 0.5) * 5 + fine * 2,
        239,
        253,
      );

      pixels[offset] = shade + 3;
      pixels[offset + 1] = shade + 1;
      pixels[offset + 2] = shade - 2;
      pixels[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    pixels,
    width,
    height,
    THREE.RGBAFormat,
  );
  texture.name = options.name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...(options.repeat ?? [3.2, 2.4]));
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};
