import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  captureAnomalyTargetInitialState,
  type AnomalyTarget,
} from '../../src/gameplay/anomalies/AnomalyTarget';
import { AnomalyTargetRegistry } from '../../src/gameplay/anomalies/AnomalyTargetRegistry';
import { AnomalyTargetSelector } from '../../src/gameplay/interaction/AnomalyTargetSelector';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';

function addTarget(
  scene: THREE.Scene,
  registry: AnomalyTargetRegistry,
  id: string,
  position: THREE.Vector3,
  dependentTargetIds: readonly string[] = [],
): AnomalyTarget {
  const object = new THREE.Group();
  object.name = `ANOM_${id}`;
  object.position.copy(position);
  const interactionVolume = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  interactionVolume.name = `INTERACT_${id}`;
  interactionVolume.layers.set(RENDER_LAYERS.interaction);
  object.add(interactionVolume);
  scene.add(object);

  const target: AnomalyTarget = {
    id,
    nodeName: object.name,
    interactionNodeNames: [interactionVolume.name],
    allowedKinds: ['hide'],
    variants: [{ id: 'hidden', kind: 'hide' }],
    weight: 1,
    minimumDifficulty: 1,
    object,
    interactionVolume,
    interactionVolumes: [interactionVolume],
    dependentTargetIds,
    initialState: captureAnomalyTargetInitialState(object),
  };
  registry.register(target);
  return target;
}

function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);
  camera.updateMatrixWorld(true);
  return camera;
}

describe('AnomalyTargetSelector', () => {
  it('returns the nearest anomaly target at the center of the camera', () => {
    const scene = new THREE.Scene();
    const registry = new AnomalyTargetRegistry();
    const near = addTarget(
      scene,
      registry,
      'chair',
      new THREE.Vector3(0, 0, -2),
    );
    addTarget(
      scene,
      registry,
      'picture',
      new THREE.Vector3(0, 0, -5),
    );
    scene.updateMatrixWorld(true);

    const selector = new AnomalyTargetSelector(registry);

    expect(selector.getTargetAtScreenCenter(createCamera())).toBe(near);
  });

  it('prefers a directly aimed dependent object over its support volume', () => {
    const scene = new THREE.Scene();
    const registry = new AnomalyTargetRegistry();
    addTarget(
      scene,
      registry,
      'bathtub',
      new THREE.Vector3(0, 0, -2),
      ['rubber-duck'],
    );
    const duck = addTarget(
      scene,
      registry,
      'rubber-duck',
      new THREE.Vector3(0, 0, -2.2),
    );
    scene.updateMatrixWorld(true);

    const selector = new AnomalyTargetSelector(registry);

    expect(selector.getTargetAtScreenCenter(createCamera())).toBe(duck);
  });

  it('does not return walls or decorative meshes from the scene layer', () => {
    const scene = new THREE.Scene();
    const registry = new AnomalyTargetRegistry();
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 0.2),
      new THREE.MeshBasicMaterial(),
    );
    wall.name = 'WALL_North';
    wall.position.set(0, 0, -2);
    scene.add(wall);
    addTarget(
      scene,
      registry,
      'lamp',
      new THREE.Vector3(3, 0, -3),
    );
    scene.updateMatrixWorld(true);

    const selector = new AnomalyTargetSelector(registry);

    expect(selector.getTargetAtScreenCenter(createCamera())).toBeNull();
  });

  it('returns null when the interaction volume is beyond selection range', () => {
    const scene = new THREE.Scene();
    const registry = new AnomalyTargetRegistry();
    addTarget(
      scene,
      registry,
      'television',
      new THREE.Vector3(0, 0, -15),
    );
    scene.updateMatrixWorld(true);

    const selector = new AnomalyTargetSelector(registry);

    expect(selector.getTargetAtScreenCenter(createCamera())).toBeNull();
  });

  it('skips a disabled target and continues to the next raycast hit', () => {
    const scene = new THREE.Scene();
    const registry = new AnomalyTargetRegistry();
    addTarget(
      scene,
      registry,
      'chair',
      new THREE.Vector3(0, 0, -2),
    );
    const picture = addTarget(
      scene,
      registry,
      'picture',
      new THREE.Vector3(0, 0, -5),
    );
    scene.updateMatrixWorld(true);

    const selector = new AnomalyTargetSelector(registry);

    expect(
      selector.getTargetAtScreenCenter(
        createCamera(),
        (target) => target.id !== 'chair',
      ),
    ).toBe(picture);
    expect(
      selector.getTargetAtScreenCenter(createCamera(), () => false),
    ).toBeNull();
  });
});
