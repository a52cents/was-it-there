import * as THREE from 'three';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const MAX_PIXEL_RATIO = 1.5;
const MAX_POST_PROCESSING_PIXEL_RATIO = 1.25;
const MINIMUM_MOTION_BLUR = 0.02;
const MAXIMUM_MOTION_BLUR_DAMPING = 0.58;
const CAMERA_CUT_DISTANCE = 0.75;
const CAMERA_CUT_ANGLE = 0.8;

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
  private readonly previousCameraPosition = new THREE.Vector3();
  private readonly previousCameraQuaternion = new THREE.Quaternion();
  private composer: EffectComposer | null = null;
  private motionBlurPass: AfterimagePass | null = null;
  private atmospherePass: ShaderPass | null = null;
  private hasPreviousCameraTransform = false;
  private motionBlurPrimed = false;
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

    this.updateMotionBlur(camera);
    this.updateAtmospherePass();
    this.renderer.info.reset();
    composer.render();
  }

  public invalidateShadows(): void {
    this.renderer.shadowMap.needsUpdate = true;
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
    this.motionBlurPass = null;
    this.atmospherePass = null;
    this.renderer.dispose();
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
    const motionBlurPass = new AfterimagePass(0);
    motionBlurPass.enabled = false;
    const colorGradePass = new ShaderPass(ROOM_COLOR_GRADE_SHADER);
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(motionBlurPass);
    composer.addPass(colorGradePass);
    composer.addPass(outputPass);
    this.composer = composer;
    this.motionBlurPass = motionBlurPass;
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

  private updateMotionBlur(camera: THREE.Camera): void {
    const motionBlurPass = this.motionBlurPass;

    if (motionBlurPass === null) {
      return;
    }

    if (!this.hasPreviousCameraTransform) {
      this.copyCameraTransform(camera);
      this.hasPreviousCameraTransform = true;
      motionBlurPass.enabled = false;
      return;
    }

    const distance = this.previousCameraPosition.distanceTo(camera.position);
    const quaternionDot = Math.min(
      Math.abs(this.previousCameraQuaternion.dot(camera.quaternion)),
      1,
    );
    const angle = 2 * Math.acos(quaternionDot);
    const isCameraCut =
      distance >= CAMERA_CUT_DISTANCE || angle >= CAMERA_CUT_ANGLE;
    const motionAmount = THREE.MathUtils.clamp(
      distance * 4 + angle * 10,
      0,
      1,
    );

    this.copyCameraTransform(camera);

    if (isCameraCut || motionAmount < MINIMUM_MOTION_BLUR) {
      motionBlurPass.enabled = false;
      this.motionBlurPrimed = false;
      return;
    }

    motionBlurPass.enabled = true;

    if (!this.motionBlurPrimed) {
      motionBlurPass.damp = 0;
      this.motionBlurPrimed = true;
      return;
    }

    motionBlurPass.damp = THREE.MathUtils.lerp(
      0.22,
      MAXIMUM_MOTION_BLUR_DAMPING,
      motionAmount,
    );
  }

  private copyCameraTransform(camera: THREE.Camera): void {
    this.previousCameraPosition.copy(camera.position);
    this.previousCameraQuaternion.copy(camera.quaternion);
  }

  private readonly handleWindowResize = (): void => {
    this.resize();
  };
}

function normalizeAtmosphereAmount(value: number): number {
  return Number.isFinite(value)
    ? THREE.MathUtils.clamp(value, 0, 1)
    : 0;
}
