import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { TargetReportHighlight } from '../../src/gameplay/interaction/TargetReportHighlight';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';

describe('TargetReportHighlight', () => {
  it('outlines the visible aimed object without including its interaction volume', () => {
    const scene = new THREE.Scene();
    const target = new THREE.Group();
    const visual = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    const interaction = new THREE.Mesh(
      new THREE.BoxGeometry(5, 5, 5),
      new THREE.MeshBasicMaterial(),
    );
    interaction.layers.set(RENDER_LAYERS.interaction);
    target.add(visual, interaction);
    scene.add(target);
    const highlight = new TargetReportHighlight(scene);

    highlight.setAimedTarget(target);

    const aimed = scene.getObjectByName(
      'REPORT_AimedTargetHighlight',
    ) as THREE.BoxHelper | undefined;
    const bounds = new THREE.Box3().setFromBufferAttribute(
      aimed?.geometry.getAttribute('position') as THREE.BufferAttribute,
    );
    expect(aimed?.visible).toBe(true);
    expect(bounds.getSize(new THREE.Vector3()).toArray()).toEqual([1, 1, 1]);

    highlight.show(target, 100);
    expect(aimed?.visible).toBe(false);
    expect(scene.getObjectByName('REPORT_CorrectTargetHighlight')?.visible).toBe(true);
    highlight.update(751);
    expect(aimed?.visible).toBe(true);

    highlight.reset();
    expect(aimed?.visible).toBe(false);
    highlight.dispose(scene);
    visual.geometry.dispose();
    visual.material.dispose();
    interaction.geometry.dispose();
    interaction.material.dispose();
  });

  it('uses the interaction volume when the anomaly itself is invisible', () => {
    const scene = new THREE.Scene();
    const target = new THREE.Group();
    const visual = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    visual.visible = false;
    const interaction = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 4),
      new THREE.MeshBasicMaterial(),
    );
    interaction.layers.set(RENDER_LAYERS.interaction);
    target.add(visual, interaction);
    scene.add(target);
    const highlight = new TargetReportHighlight(scene);

    highlight.setAimedTarget(target);

    const aimed = scene.getObjectByName(
      'REPORT_AimedTargetHighlight',
    ) as THREE.BoxHelper | undefined;
    const bounds = new THREE.Box3().setFromBufferAttribute(
      aimed?.geometry.getAttribute('position') as THREE.BufferAttribute,
    );
    expect(bounds.getSize(new THREE.Vector3()).toArray()).toEqual([3, 2, 4]);
    highlight.dispose(scene);
    visual.geometry.dispose();
    visual.material.dispose();
    interaction.geometry.dispose();
    interaction.material.dispose();
  });
});
