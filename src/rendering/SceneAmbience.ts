import * as THREE from 'three';

const SKY_WIDTH = 128;
const SKY_HEIGHT = 64;
const NIGHT_SKY = [18, 29, 38] as const;
const HORIZON_GLOW = [76, 91, 94] as const;
const GROUND_HAZE = [39, 35, 31] as const;

export function createAmbientSkyTexture(): THREE.DataTexture {
  const data = new Uint8Array(SKY_WIDTH * SKY_HEIGHT * 4);

  for (let y = 0; y < SKY_HEIGHT; y += 1) {
    const verticalProgress = y / (SKY_HEIGHT - 1);
    const aboveHorizon = verticalProgress < 0.58;
    const gradientProgress = smoothstep(
      aboveHorizon
        ? verticalProgress / 0.58
        : (verticalProgress - 0.58) / 0.42,
    );
    const start = aboveHorizon ? NIGHT_SKY : HORIZON_GLOW;
    const end = aboveHorizon ? HORIZON_GLOW : GROUND_HAZE;

    for (let x = 0; x < SKY_WIDTH; x += 1) {
      const offset = (y * SKY_WIDTH + x) * 4;
      const horizontalGlow = Math.max(
        0,
        1 - Math.abs(x / (SKY_WIDTH - 1) - 0.68) * 3.4,
      );

      for (let channel = 0; channel < 3; channel += 1) {
        const startChannel = start[channel] ?? 0;
        const endChannel = end[channel] ?? 0;
        data[offset + channel] = Math.min(
          255,
          Math.round(
            THREE.MathUtils.lerp(
              startChannel,
              endChannel,
              gradientProgress,
            ) + horizontalGlow * (aboveHorizon ? 5 : 2),
          ),
        );
      }

      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    SKY_WIDTH,
    SKY_HEIGHT,
    THREE.RGBAFormat,
  );
  texture.name = 'TEXTURE_AmbientNightSky';
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function smoothstep(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}
