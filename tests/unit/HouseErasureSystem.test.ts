import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HouseErasureSystem } from '../../src/gameplay/story/HouseErasureSystem';

describe('HouseErasureSystem', () => {
  it('erases non-anomalies first and restores them after a warning timeout', () => {
    const root = new THREE.Group();
    const normalTarget = createTarget('normal');
    const anomalyTarget = createTarget('anomaly');
    const detail = createTarget('DETAIL_TableSetting');
    const wall = createMesh('WALL_North');
    root.add(normalTarget, anomalyTarget, detail, wall);
    const system = new HouseErasureSystem();

    system.beginSearch(
      root,
      [
        { id: 'normal', object: normalTarget },
        { id: 'anomaly', object: anomalyTarget },
      ],
      ['anomaly'],
    );
    system.applySearchCountdown(0, 10_000);

    expect(normalTarget.visible).toBe(false);
    expect(anomalyTarget.visible).toBe(true);
    expect(wall.visible).toBe(true);

    system.advanceTimeoutStage();
    system.applySearchCountdown(0, 10_000);
    expect(detail.visible).toBe(false);

    system.restoreSearch();
    expect(normalTarget.visible).toBe(true);
    expect(detail.visible).toBe(true);
  });

  it('removes structure and active anomalies late in the fatal sequence', () => {
    const root = new THREE.Group();
    const normalTarget = createTarget('normal');
    const anomalyTarget = createTarget('anomaly');
    const wall = createMesh('WALL_North');
    root.add(normalTarget, anomalyTarget, wall);
    const system = new HouseErasureSystem();

    system.beginSearch(
      root,
      [
        { id: 'normal', object: normalTarget },
        { id: 'anomaly', object: anomalyTarget },
      ],
      ['anomaly'],
    );
    system.applyFailure(0.5);

    expect(normalTarget.visible).toBe(false);
    expect(anomalyTarget.visible).toBe(true);

    system.applyFailure(1);
    expect(anomalyTarget.visible).toBe(false);
    expect(wall.visible).toBe(false);

    system.release();
    expect(normalTarget.visible).toBe(true);
    expect(anomalyTarget.visible).toBe(true);
    expect(wall.visible).toBe(true);
  });
});

function createTarget(name: string): THREE.Group {
  const target = new THREE.Group();
  target.name = name;
  target.add(createMesh(`${name}_mesh`));
  return target;
}

function createMesh(name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  mesh.name = name;
  return mesh;
}
