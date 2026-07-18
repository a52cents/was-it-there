import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  captureAnomalyTargetInitialState,
  type AnomalyTarget,
} from '../../src/gameplay/anomalies/AnomalyTarget';
import { AnomalyTargetRegistry } from '../../src/gameplay/anomalies/AnomalyTargetRegistry';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';

function createTarget(id: string): AnomalyTarget {
  const object = new THREE.Group();
  object.name = `ANOM_${id}`;
  const visual = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x336699 }),
  );
  visual.name = `${id}_Visual`;
  const interactionVolume = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshBasicMaterial(),
  );
  interactionVolume.name = `INTERACT_${id}`;
  interactionVolume.layers.set(RENDER_LAYERS.interaction);
  object.add(visual, interactionVolume);

  return {
    id,
    nodeName: object.name,
    interactionNodeNames: [interactionVolume.name],
    allowedKinds: ['hide', 'rotate', 'color'],
    variants: [{ id: 'hidden', kind: 'hide' }],
    weight: 1,
    minimumDifficulty: 1,
    object,
    interactionVolume,
    interactionVolumes: [interactionVolume],
    initialState: captureAnomalyTargetInitialState(object),
  };
}

describe('AnomalyTargetRegistry', () => {
  it('indexes a target by logical id and interaction volume', () => {
    const registry = new AnomalyTargetRegistry();
    const target = createTarget('television');

    registry.register(target);

    expect(registry.getAll()).toEqual([target]);
    expect(registry.getById('television')).toBe(target);
    expect(
      registry.resolveInteractionObject(target.interactionVolume),
    ).toBe(target);
  });

  it('indexes multiple interaction volumes for one target', () => {
    const registry = new AnomalyTargetRegistry();
    const base = createTarget('wardrobe');
    const secondVolume = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.8, 0.6),
      new THREE.MeshBasicMaterial(),
    );
    secondVolume.name = 'INTERACT_wardrobe_Right';
    secondVolume.layers.set(RENDER_LAYERS.interaction);
    base.object.add(secondVolume);
    const target: AnomalyTarget = {
      ...base,
      interactionNodeNames: [base.interactionVolume.name, secondVolume.name],
      interactionVolumes: [base.interactionVolume, secondVolume],
    };

    registry.register(target);

    expect(registry.getInteractionVolumes()).toEqual([
      base.interactionVolume,
      secondVolume,
    ]);
    expect(registry.resolveInteractionObject(secondVolume)).toBe(target);
  });

  it('rejects duplicate logical ids', () => {
    const registry = new AnomalyTargetRegistry();
    registry.register(createTarget('chair'));

    expect(() => registry.register(createTarget('chair'))).toThrow(
      'Duplicate anomaly target id "chair".',
    );
  });

  it('captures initial transforms, visibility, and material colors by value', () => {
    const target = createTarget('plant');
    const objectSnapshot = target.initialState.nodes[0];
    const visualSnapshot = target.initialState.nodes.find(
      (snapshot) => snapshot.node.name === 'plant_Visual',
    );

    expect(objectSnapshot?.position).toEqual([0, 0, 0]);
    expect(visualSnapshot?.visible).toBe(true);
    expect(visualSnapshot?.materials[0]?.color).not.toBeNull();
    expect(
      target.initialState.nodes.some(
        (snapshot) => snapshot.node === target.interactionVolume,
      ),
    ).toBe(false);

    target.object.position.set(4, 5, 6);
    target.object.visible = false;

    expect(objectSnapshot?.position).toEqual([0, 0, 0]);
    expect(objectSnapshot?.visible).toBe(true);
  });

  it('clears every lookup', () => {
    const registry = new AnomalyTargetRegistry();
    const target = createTarget('books');
    registry.register(target);

    registry.clear();

    expect(registry.getAll()).toHaveLength(0);
    expect(registry.getById('books')).toBeNull();
    expect(
      registry.resolveInteractionObject(target.interactionVolume),
    ).toBeNull();
  });
});
