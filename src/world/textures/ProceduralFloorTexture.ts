import * as THREE from 'three';

interface BaseFloorTextureOptions {
  readonly name: string;
  readonly seed: number;
  readonly repeat: readonly [number, number];
}

interface WoodFloorTextureOptions extends BaseFloorTextureOptions {
  readonly plankColors: readonly THREE.ColorRepresentation[];
  readonly seamColor: THREE.ColorRepresentation;
}

interface TileFloorTextureOptions extends BaseFloorTextureOptions {
  readonly tileColors: readonly THREE.ColorRepresentation[];
  readonly groutColor: THREE.ColorRepresentation;
}

const hash = (x: number, y: number, seed: number): number => {
  let value = Math.imul(x, 374_761_393)
    + Math.imul(y, 668_265_263)
    + Math.imul(seed, 69_069);
  value = Math.imul(value ^ (value >>> 13), 1_274_126_177);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_295;
};

const writeColor = (
  data: Uint8Array,
  offset: number,
  color: THREE.Color,
  shade = 0,
): void => {
  data[offset] = THREE.MathUtils.clamp(Math.round(color.r * 255 + shade), 0, 255);
  data[offset + 1] = THREE.MathUtils.clamp(Math.round(color.g * 255 + shade), 0, 255);
  data[offset + 2] = THREE.MathUtils.clamp(Math.round(color.b * 255 + shade), 0, 255);
  data[offset + 3] = 255;
};

const finishTexture = (
  data: Uint8Array,
  options: BaseFloorTextureOptions,
): THREE.DataTexture => {
  const texture = new THREE.DataTexture(data, 128, 128, THREE.RGBAFormat);
  texture.name = options.name;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...options.repeat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

export const createWoodPlankFloorTexture = (
  options: WoodFloorTextureOptions,
): THREE.DataTexture => {
  const size = 128;
  const plankHeight = 16;
  const plankLength = 64;
  const colors = options.plankColors.map((color) => new THREE.Color(color));
  const seam = new THREE.Color(options.seamColor);
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / plankHeight);
    const localY = y % plankHeight;
    const stagger = row % 2 === 0 ? 0 : plankLength / 2;

    for (let x = 0; x < size; x += 1) {
      const shiftedX = (x + stagger) % size;
      const localX = shiftedX % plankLength;
      const plank = row * 3 + Math.floor(shiftedX / plankLength);
      const offset = (y * size + x) * 4;

      if (localY < 2 || localX < 2) {
        writeColor(data, offset, seam, hash(x, y, options.seed) * 3 - 1.5);
        continue;
      }

      const colorIndex = Math.floor(
        hash(plank, row, options.seed) * colors.length,
      ) % colors.length;
      const color = colors[colorIndex] ?? colors[0] ?? new THREE.Color('#80664f');
      const plankVariation = (hash(plank, row, options.seed + 17) - 0.5) * 12;
      const grainWave = Math.sin((x + options.seed * 0.13) * 0.34 + row * 1.7) * 2.4;
      const fineGrain = (hash(x, y, options.seed + 41) - 0.5) * 4;
      const edgeWear = Math.min(localY - 2, plankHeight - localY) < 2 ? -3 : 0;
      writeColor(
        data,
        offset,
        color,
        plankVariation + grainWave + fineGrain + edgeWear,
      );
    }
  }

  return finishTexture(data, options);
};

export const createStoneTileFloorTexture = (
  options: TileFloorTextureOptions,
): THREE.DataTexture => {
  const size = 128;
  const tileSize = 32;
  const groutWidth = 2;
  const colors = options.tileColors.map((color) => new THREE.Color(color));
  const grout = new THREE.Color(options.groutColor);
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const localX = x % tileSize;
      const localY = y % tileSize;
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const offset = (y * size + x) * 4;

      if (localX < groutWidth || localY < groutWidth) {
        writeColor(data, offset, grout, (hash(x, y, options.seed) - 0.5) * 3);
        continue;
      }

      const tileHash = hash(tileX, tileY, options.seed);
      const colorIndex = Math.floor(tileHash * colors.length) % colors.length;
      const color = colors[colorIndex] ?? colors[0] ?? new THREE.Color('#91877c');
      const tileVariation = (hash(tileX, tileY, options.seed + 19) - 0.5) * 10;
      const mottling = (hash(x, y, options.seed + 53) - 0.5) * 5;
      const wornEdge = Math.min(localX, localY, tileSize - localX, tileSize - localY) < 4
        ? -2
        : 0;
      writeColor(data, offset, color, tileVariation + mottling + wornEdge);
    }
  }

  return finishTexture(data, options);
};
