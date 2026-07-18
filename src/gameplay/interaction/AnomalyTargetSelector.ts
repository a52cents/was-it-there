import * as THREE from 'three';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';
import type { AnomalyTarget } from '../anomalies/AnomalyTarget';
import type { AnomalyTargetRegistry } from '../anomalies/AnomalyTargetRegistry';

const SCREEN_CENTER = new THREE.Vector2(0, 0);
const DEFAULT_SELECTION_DISTANCE = 12;

export class AnomalyTargetSelector {
  private readonly raycaster = new THREE.Raycaster(
    undefined,
    undefined,
    0,
    DEFAULT_SELECTION_DISTANCE,
  );

  public constructor(private readonly registry: AnomalyTargetRegistry) {
    this.raycaster.layers.set(RENDER_LAYERS.interaction);
  }

  public getTargetAtScreenCenter(
    camera: THREE.Camera,
    isSelectable: (target: AnomalyTarget) => boolean = () => true,
  ): AnomalyTarget | null {
    this.raycaster.setFromCamera(SCREEN_CENTER, camera);

    const intersections = this.raycaster.intersectObjects(
      this.registry.getInteractionVolumes(),
      false,
    );
    const candidates: AnomalyTarget[] = [];
    const seenTargetIds = new Set<string>();

    for (const intersection of intersections) {
      const target = this.registry.resolveInteractionObject(intersection.object);

      if (
        target !== null &&
        !seenTargetIds.has(target.id) &&
        isSelectable(target)
      ) {
        candidates.push(target);
        seenTargetIds.add(target.id);
      }
    }

    const nearest = candidates[0];

    if (nearest === undefined) {
      return null;
    }

    const dependent = candidates.find((candidate) =>
      nearest.dependentTargetIds?.includes(candidate.id),
    );
    return dependent ?? nearest;
  }
}
