import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const MAX_PIXEL_RATIO = 1.5;
const MAX_POST_PROCESSING_PIXEL_RATIO = 1.25;

const ROOM_COLOR_GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    atmosphereTime: { value: 0 },
    atmosphereStress: { value: 0 },
    atmosphereCalmPulse: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float atmosphereTime;
    uniform float atmosphereStress;
    uniform float atmosphereCalmPulse;

    varying vec2 vUv;

    float atmosphereNoise(vec2 position) {
      return fract(
        sin(dot(position, vec2(12.9898, 78.233))) * 43758.5453
      );
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 centeredUv = vUv - 0.5;
      float edgeDistance = length(centeredUv);
      float edgeMask = smoothstep(0.18, 0.72, edgeDistance);
      vec3 sampledColor = texel.rgb;

      if (atmosphereStress > 0.01) {
        vec2 edgeDirection = centeredUv / max(edgeDistance, 0.001);
        float aberrationPulse = 0.82 + sin(atmosphereTime * 0.71) * 0.18;
        vec2 colorOffset = edgeDirection * edgeMask
          * atmosphereStress * 0.0011 * aberrationPulse;
        sampledColor.r = texture2D(
          tDiffuse,
          clamp(vUv + colorOffset, vec2(0.0), vec2(1.0))
        ).r;
        sampledColor.b = texture2D(
          tDiffuse,
          clamp(vUv - colorOffset, vec2(0.0), vec2(1.0))
        ).b;
      }

      float luminance = dot(sampledColor, vec3(0.2126, 0.7152, 0.0722));
      float saturation = 0.99 - atmosphereStress * 0.055;
      vec3 color = mix(vec3(luminance), sampledColor, saturation);

      float highlightMix = smoothstep(0.18, 1.1, luminance);
      vec3 shadowTint = mix(
        vec3(0.965, 0.955, 0.94),
        vec3(0.89, 0.96, 1.08),
        atmosphereStress * 0.58
      );
      vec3 highlightTint = vec3(1.045, 1.005, 0.94)
        + vec3(0.012, 0.006, -0.004) * atmosphereCalmPulse;
      color *= mix(shadowTint, highlightTint, highlightMix);
      color = (color - 0.5) * 1.02 + 0.5;

      float vignette = smoothstep(0.32, 0.78, length(centeredUv));
      float breathing = 0.5 + sin(atmosphereTime * 0.62) * 0.5;
      float vignetteStrength = 0.1
        + atmosphereStress * (0.055 + breathing * 0.026)
        - atmosphereCalmPulse * 0.01;
      color *= 1.0 - vignette * vignetteStrength;

      float flickerNoise = atmosphereNoise(
        vec2(floor(atmosphereTime * 3.0), 19.17)
      );
      float flickerWave = 0.5 + sin(atmosphereTime * 1.47) * 0.5;
      float flickerStrength = 0.002 + atmosphereStress * 0.0065;
      color *= 1.0 - flickerNoise * flickerWave * flickerStrength;

      float grainFrame = floor(atmosphereTime * 24.0);
      float grain = atmosphereNoise(gl_FragCoord.xy + grainFrame) - 0.5;
      color += grain * (0.0035 + atmosphereStress * 0.006);

      gl_FragColor = vec4(max(color, 0.0), texel.a);
    }
  `,
} as const;

export interface RendererStats {
  readonly drawCalls: number;
  readonly triangles: number;
}

export class RendererManager {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly warmupTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  private composer: EffectComposer | null = null;
  private atmospherePass: ShaderPass | null = null;
  private atmosphereStress = 0;
  private atmosphereCalmPulse = 0;
  private lastWidth = 0;
  private lastHeight = 0;
  private lastPixelRatio = 0;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onViewportResize: (width: number, height: number) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.info.autoReset = false;

    window.addEventListener('resize', this.handleWindowResize);
    this.resize();
  }

  public resize(): void {
    const width = Math.floor(this.canvas.clientWidth);
    const height = Math.floor(this.canvas.clientHeight);

    if (width <= 0 || height <= 0) {
      return;
    }

    const devicePixelRatio = Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : 1;
    const pixelRatio = Math.min(
      Math.max(devicePixelRatio, 1),
      MAX_PIXEL_RATIO,
    );

    if (
      width === this.lastWidth &&
      height === this.lastHeight &&
      pixelRatio === this.lastPixelRatio
    ) {
      return;
    }

    this.lastWidth = width;
    this.lastHeight = height;
    this.lastPixelRatio = pixelRatio;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer?.setPixelRatio(
      Math.min(pixelRatio, MAX_POST_PROCESSING_PIXEL_RATIO),
    );
    this.composer?.setSize(width, height);
    this.onViewportResize(width, height);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    const composer = this.ensurePostProcessing(scene, camera);

    this.updateAtmospherePass();
    this.renderer.info.reset();
    composer.render();
  }

  public invalidateShadows(): void {
    this.renderer.shadowMap.needsUpdate = true;
  }

  public async prepareObject(
    object: THREE.Object3D,
    camera: THREE.Camera,
    targetScene: THREE.Scene,
  ): Promise<void> {
    const hiddenObjects: THREE.Object3D[] = [];
    const initializedTextures = new Set<THREE.Texture>();

    object.traverse((node) => {
      if (!node.visible) {
        hiddenObjects.push(node);
        node.visible = true;
      }

      const mesh = node as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const material of materials) {
        for (const value of Object.values(material)) {
          const texture = value as THREE.Texture;

          if (
            texture?.isTexture === true &&
            !initializedTextures.has(texture)
          ) {
            initializedTextures.add(texture);
            this.renderer.initTexture(texture);
          }
        }
      }
    });
    object.updateMatrixWorld(true);

    try {
      await this.renderer.compileAsync(object, camera, targetScene);
      await waitForRendererFrame();
      this.warmObjectGeometry(object, camera);
    } finally {
      for (const hiddenObject of hiddenObjects) {
        hiddenObject.visible = false;
      }
    }
  }

  public async warmObjectShadowsIncrementally(
    object: THREE.Object3D,
    camera: THREE.Camera,
  ): Promise<void> {
    const shadowLights: THREE.Light[] = [];

    object.traverse((node) => {
      const light = node as THREE.Light;

      if (light.isLight && light.castShadow && light.visible) {
        shadowLights.push(light);
      }
    });

    for (const activeLight of shadowLights) {
      await waitForRendererFrame();
      const objectVisible = object.visible;
      const lightVisibility = shadowLights.map((light) => light.visible);

      try {
        object.visible = true;

        for (const light of shadowLights) {
          light.visible = light === activeLight;
        }

        this.warmShadowFrame(object, camera);
      } finally {
        object.visible = objectVisible;

        for (const [index, light] of shadowLights.entries()) {
          light.visible = lightVisibility[index] ?? true;
        }
      }
    }

    await waitForRendererFrame();
  }

  private warmShadowFrame(
    object: THREE.Object3D,
    camera: THREE.Camera,
  ): void {
    const previousRenderTarget = this.renderer.getRenderTarget();
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const previousShadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;
    let completed = false;

    try {
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
      this.renderer.setRenderTarget(this.warmupTarget);
      this.renderer.render(object, camera);
      completed = true;
    } finally {
      this.renderer.setRenderTarget(previousRenderTarget);
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      this.renderer.shadowMap.needsUpdate = completed
        ? false
        : previousShadowNeedsUpdate;
    }
  }

  public setAtmosphereProfile(stress: number, calmPulse: number): void {
    this.atmosphereStress = normalizeAtmosphereAmount(stress);
    this.atmosphereCalmPulse = normalizeAtmosphereAmount(calmPulse);
  }

  public getStats(): RendererStats {
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleWindowResize);
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.composer = null;
    this.atmospherePass = null;
    this.warmupTarget.dispose();
    this.renderer.dispose();
  }

  private warmObjectGeometry(
    object: THREE.Object3D,
    camera: THREE.Camera,
  ): void {
    const frustumCullingStates: {
      readonly object: THREE.Object3D;
      readonly frustumCulled: boolean;
    }[] = [];
    const previousRenderTarget = this.renderer.getRenderTarget();
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const previousShadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;

    object.traverse((node) => {
      frustumCullingStates.push({
        object: node,
        frustumCulled: node.frustumCulled,
      });
      node.frustumCulled = false;
    });

    try {
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = false;
      this.renderer.setRenderTarget(this.warmupTarget);
      this.renderer.render(object, camera);
    } finally {
      this.renderer.setRenderTarget(previousRenderTarget);
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      this.renderer.shadowMap.needsUpdate = previousShadowNeedsUpdate;

      for (const state of frustumCullingStates) {
        state.object.frustumCulled = state.frustumCulled;
      }
    }
  }

  private ensurePostProcessing(
    scene: THREE.Scene,
    camera: THREE.Camera,
  ): EffectComposer {
    if (this.composer !== null) {
      return this.composer;
    }

    const composer = new EffectComposer(this.renderer);
    composer.setPixelRatio(
      Math.min(this.lastPixelRatio, MAX_POST_PROCESSING_PIXEL_RATIO),
    );
    const renderPass = new RenderPass(scene, camera);
    const colorGradePass = new ShaderPass(ROOM_COLOR_GRADE_SHADER);
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(colorGradePass);
    composer.addPass(outputPass);
    this.composer = composer;
    this.atmospherePass = colorGradePass;
    return composer;
  }

  private updateAtmospherePass(): void {
    const pass = this.atmospherePass;

    if (pass === null) {
      return;
    }

    const timeUniform = pass.uniforms['atmosphereTime'];
    const stressUniform = pass.uniforms['atmosphereStress'];
    const calmPulseUniform = pass.uniforms['atmosphereCalmPulse'];

    if (
      timeUniform === undefined ||
      stressUniform === undefined ||
      calmPulseUniform === undefined
    ) {
      throw new Error('The atmosphere shader uniforms are incomplete.');
    }

    timeUniform.value = performance.now() / 1_000;
    stressUniform.value = this.atmosphereStress;
    calmPulseUniform.value = this.atmosphereCalmPulse;
  }

  private readonly handleWindowResize = (): void => {
    this.resize();
  };
}

function waitForRendererFrame(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (): void => {
      if (resolved) {
        return;
      }

      resolved = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 100);
    window.requestAnimationFrame(finish);
  });
}

function normalizeAtmosphereAmount(value: number): number {
  return Number.isFinite(value)
    ? THREE.MathUtils.clamp(value, 0, 1)
    : 0;
}
