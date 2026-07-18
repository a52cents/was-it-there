import type * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface GlbAssetLoader {
  load(url: string): Promise<THREE.Group>;
}

export class ThreeGlbAssetLoader implements GlbAssetLoader {
  private readonly loader = new GLTFLoader();

  public async load(url: string): Promise<THREE.Group> {
    const gltf = await this.loader.loadAsync(url);

    if (gltf.scene.children.length === 0) {
      throw new Error(`GLB scene loaded from "${url}" is empty.`);
    }

    return gltf.scene;
  }
}
