import * as THREE from 'three';

export interface DebugObservationTarget {
  readonly id: string;
  readonly object: THREE.Object3D;
}

interface TargetLabel {
  readonly target: DebugObservationTarget;
  readonly element: HTMLSpanElement;
}

export class ObservationTargetDebugLabels {
  private readonly container: HTMLElement;
  private readonly worldPosition = new THREE.Vector3();
  private readonly projectedPosition = new THREE.Vector3();
  private readonly labels: TargetLabel[] = [];
  private visible = false;

  public constructor(private readonly root: HTMLElement) {
    this.container = root.ownerDocument.createElement('div');
    this.container.setAttribute('aria-hidden', 'true');
    this.container.style.cssText = [
      'position: absolute',
      'inset: 0',
      'overflow: hidden',
      'pointer-events: none',
    ].join(';');
    this.container.hidden = true;
    root.append(this.container);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.hidden = !visible;
  }

  public update(
    targets: readonly DebugObservationTarget[],
    camera: THREE.Camera,
  ): void {
    this.synchronizeTargets(targets);

    if (!this.visible) {
      return;
    }

    const width = this.root.clientWidth;
    const height = this.root.clientHeight;

    for (const label of this.labels) {
      label.target.object.getWorldPosition(this.worldPosition);
      this.projectedPosition.copy(this.worldPosition).project(camera);
      const onScreen =
        this.projectedPosition.z >= -1 &&
        this.projectedPosition.z <= 1 &&
        this.projectedPosition.x >= -1.1 &&
        this.projectedPosition.x <= 1.1 &&
        this.projectedPosition.y >= -1.1 &&
        this.projectedPosition.y <= 1.1;

      label.element.hidden = !onScreen;

      if (onScreen) {
        label.element.style.left = `${(this.projectedPosition.x * 0.5 + 0.5) * width}px`;
        label.element.style.top = `${(-this.projectedPosition.y * 0.5 + 0.5) * height}px`;
      }
    }
  }

  public dispose(): void {
    this.labels.length = 0;
    this.container.remove();
  }

  private synchronizeTargets(
    targets: readonly DebugObservationTarget[],
  ): void {
    const unchanged =
      targets.length === this.labels.length &&
      targets.every(
        (target, index) => this.labels[index]?.target.object === target.object,
      );

    if (unchanged) {
      return;
    }

    this.labels.length = 0;
    this.container.replaceChildren();

    for (const target of targets) {
      const element = this.root.ownerDocument.createElement('span');
      const verticalOffset = this.labels.length % 2 === 0 ? 0.35 : 1.45;
      element.textContent = target.id;
      element.style.cssText = [
        'position: absolute',
        `transform: translate(-50%, calc(-100% - ${verticalOffset}rem))`,
        'border: 1px solid rgb(232 195 90 / 75%)',
        'border-radius: 0.15rem',
        'padding: 0.15rem 0.3rem',
        'color: #181818',
        'background: rgb(232 195 90 / 88%)',
        'font-family: ui-monospace, "Cascadia Mono", monospace',
        'font-size: 0.65rem',
        'line-height: 1',
        'white-space: nowrap',
      ].join(';');
      this.container.append(element);
      this.labels.push({ target, element });
    }
  }
}
