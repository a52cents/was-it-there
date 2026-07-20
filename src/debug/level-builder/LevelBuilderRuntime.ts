import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { GameLoop } from '../../app/GameLoop';
import type { AnomalyTargetRegistry } from '../../gameplay/anomalies/AnomalyTargetRegistry';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';
import {
  applyLevelBuilderObjectState,
  captureLevelBuilderObjectState,
  type LevelBuilderObjectState,
} from './LevelBuilderDocument';
import {
  LEVEL_BUILDER_DEFAULT_EDITOR_BRIGHTNESS,
  LEVEL_BUILDER_MAX_EDITOR_BRIGHTNESS,
  LevelBuilderPanel,
  type LevelBuilderRoomOption,
  type LevelBuilderTransformMode,
} from './LevelBuilderPanel';
import { LevelBuilderSession } from './LevelBuilderSession';
import {
  LEVEL_BUILDER_SNAP_PRESETS,
  type LevelBuilderSnapPreset,
} from './LevelBuilderSnap';

export interface LevelBuilderRuntimeOptions {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  readonly panelRoot: HTMLElement;
  readonly roomId: string;
  readonly roomRoot: THREE.Object3D;
  readonly rooms: readonly LevelBuilderRoomOption[];
  readonly anomalyTargets: AnomalyTargetRegistry;
  readonly gameLoop: GameLoop;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onRoomChange: (roomIndex: number) => Promise<void>;
  readonly onObjectChanged: () => void;
}

const POINTER_CLICK_TOLERANCE_PX = 5;

export class LevelBuilderRuntime {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly orbitControls: OrbitControls;
  private readonly transformControls: TransformControls;
  private readonly transformHelper: THREE.Object3D;
  private readonly selectionHelper: THREE.BoxHelper;
  private readonly editorLight: THREE.AmbientLight;
  private readonly session: LevelBuilderSession;
  private readonly panel: LevelBuilderPanel;
  private readonly originalStates = new Map<
    THREE.Object3D,
    LevelBuilderObjectState
  >();
  private readonly savedCameraPosition = new THREE.Vector3();
  private readonly savedCameraQuaternion = new THREE.Quaternion();
  private openState = false;
  private disposing = false;
  private startedLoopForEditor = false;
  private pointerDownPosition: THREE.Vector2 | null = null;
  private skipNextCanvasSelection = false;
  private layoutDirty = false;
  private editorBrightness = LEVEL_BUILDER_DEFAULT_EDITOR_BRIGHTNESS;

  public constructor(private readonly options: LevelBuilderRuntimeOptions) {
    this.session = new LevelBuilderSession(
      options.roomId,
      options.roomRoot,
      (object) => this.resolveAnomalyTargetId(object),
    );
    this.orbitControls = new OrbitControls(options.camera, options.canvas);
    this.orbitControls.enabled = false;
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.minDistance = 0.35;
    this.orbitControls.maxDistance = 18;
    this.orbitControls.screenSpacePanning = true;

    this.transformControls = new TransformControls(
      options.camera,
      options.canvas,
    );
    this.transformControls.enabled = false;
    this.transformControls.setMode('translate');
    this.setSnapPreset('normal');
    this.transformControls.setSize(0.82);
    this.transformHelper = this.transformControls.getHelper();
    this.transformHelper.name = 'LEVEL_BUILDER_TransformGizmo';
    this.transformHelper.visible = false;
    options.scene.add(this.transformHelper);

    this.selectionHelper = new THREE.BoxHelper(
      options.roomRoot,
      0xe8c35a,
    );
    this.selectionHelper.name = 'LEVEL_BUILDER_Selection';
    this.selectionHelper.visible = false;
    this.selectionHelper.renderOrder = 30;
    this.selectionHelper.material.depthTest = false;
    this.selectionHelper.material.transparent = true;
    this.selectionHelper.material.opacity = 0.9;
    this.selectionHelper.layers.set(RENDER_LAYERS.debug);
    options.scene.add(this.selectionHelper);

    this.editorLight = new THREE.AmbientLight(0xffffff, 0);
    this.editorLight.name = 'LEVEL_BUILDER_EditorLight';
    options.scene.add(this.editorLight);

    this.panel = new LevelBuilderPanel(options.panelRoot, {
      roomRoot: options.roomRoot,
      roomId: options.roomId,
      rooms: options.rooms,
      session: this.session,
      onClose: () => this.close(),
      onSelectObject: (object) => this.selectObject(object),
      onTransformModeChange: (mode) => this.setTransformMode(mode),
      onSnapPresetChange: (preset) => this.setSnapPreset(preset),
      onEditorBrightnessChange: (brightness) =>
        this.setEditorBrightness(brightness),
      onDuplicateSelection: () => this.duplicateSelection(),
      onRemoveSelection: () => this.removeSelection(),
      onRoomChange: (roomIndex) => this.changeRoom(roomIndex),
      onFocusSelection: () => this.focusSelection(),
      onObjectChanged: () => this.handleEditedObjectChanged(),
    });

    this.transformControls.addEventListener(
      'dragging-changed',
      this.handleTransformDraggingChanged,
    );
    this.transformControls.addEventListener(
      'objectChange',
      this.handleTransformObjectChange,
    );
    options.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    options.canvas.addEventListener('pointerup', this.handleCanvasPointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public open(): void {
    if (this.openState) {
      return;
    }

    this.openState = true;
    this.startedLoopForEditor = !this.options.gameLoop.isRunning;
    this.savedCameraPosition.copy(this.options.camera.position);
    this.savedCameraQuaternion.copy(this.options.camera.quaternion);
    this.options.onOpen();
    this.orbitControls.enabled = true;
    this.transformControls.enabled = true;
    this.transformHelper.visible = true;
    this.editorLight.intensity = this.editorBrightness;
    this.frameRoom();
    this.panel.show();
    this.panel.setStatus(
      'Select an object. W/E/R switch move, rotate, and scale.',
    );
    this.options.gameLoop.start();
  }

  public close(): void {
    if (!this.openState) {
      return;
    }

    for (const addition of this.session.clearAdditions()) {
      this.originalStates.delete(addition);
      disposeClonedMaterials(addition);
    }

    for (const [object, state] of this.originalStates) {
      applyLevelBuilderObjectState(object, state);
    }

    this.originalStates.clear();
    this.session.select(null);
    this.transformControls.detach();
    this.transformControls.enabled = false;
    this.transformHelper.visible = false;
    this.orbitControls.enabled = false;
    this.selectionHelper.visible = false;
    this.editorLight.intensity = 0;
    this.panel.hide();
    this.options.camera.position.copy(this.savedCameraPosition);
    this.options.camera.quaternion.copy(this.savedCameraQuaternion);
    this.options.camera.updateMatrixWorld(true);
    this.openState = false;
    this.layoutDirty = false;
    this.options.onObjectChanged();
    if (!this.disposing) {
      this.options.onClose();
    }

    if (this.startedLoopForEditor) {
      this.options.gameLoop.stop();
    }

    this.startedLoopForEditor = false;
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public update(): void {
    if (!this.openState) {
      return;
    }

    this.orbitControls.update();
    const selection = this.session.getSelection();

    if (selection !== null) {
      this.selectionHelper.setFromObject(selection.object);
    }
  }

  public dispose(): void {
    this.disposing = true;
    this.close();
    this.options.canvas.removeEventListener(
      'pointerdown',
      this.handleCanvasPointerDown,
    );
    this.options.canvas.removeEventListener(
      'pointerup',
      this.handleCanvasPointerUp,
    );
    window.removeEventListener('keydown', this.handleKeyDown);
    this.transformControls.removeEventListener(
      'dragging-changed',
      this.handleTransformDraggingChanged,
    );
    this.transformControls.removeEventListener(
      'objectChange',
      this.handleTransformObjectChange,
    );
    this.transformControls.dispose();
    this.orbitControls.dispose();
    this.options.scene.remove(
      this.transformHelper,
      this.selectionHelper,
      this.editorLight,
    );
    this.selectionHelper.geometry.dispose();
    this.selectionHelper.material.dispose();
    this.panel.dispose();
  }

  private setEditorBrightness(brightness: number): void {
    this.editorBrightness = THREE.MathUtils.clamp(
      Number.isFinite(brightness) ? brightness : 0,
      0,
      LEVEL_BUILDER_MAX_EDITOR_BRIGHTNESS,
    );

    if (this.openState) {
      this.editorLight.intensity = this.editorBrightness;
    }
  }

  private selectObject(sourceObject: THREE.Object3D): void {
    const object = this.resolveEditableObject(sourceObject);

    if (object === null) {
      this.panel.setStatus('This scene helper cannot be edited.', true);
      return;
    }

    if (!this.originalStates.has(object)) {
      this.originalStates.set(
        object,
        captureLevelBuilderObjectState(object),
      );
    }

    this.session.select(object);
    this.transformControls.attach(object);
    this.transformHelper.visible = true;
    this.selectionHelper.setFromObject(object);
    this.selectionHelper.visible = true;
    this.panel.setStatus(`Selected ${object.name || object.type}.`);
    this.panel.refresh();
  }

  private resolveEditableObject(
    sourceObject: THREE.Object3D,
  ): THREE.Object3D | null {
    if (
      sourceObject === this.options.roomRoot ||
      sourceObject.name.startsWith('INTERACT_') ||
      sourceObject.name.startsWith('LEVEL_BUILDER_')
    ) {
      return null;
    }

    for (const target of this.options.anomalyTargets.getAll()) {
      if (
        sourceObject === target.object ||
        isDescendantOf(sourceObject, target.object)
      ) {
        return target.object;
      }
    }

    let current = sourceObject;

    while (
      current.parent !== null &&
      current.parent !== this.options.roomRoot
    ) {
      current = current.parent;
    }

    return current.parent === this.options.roomRoot ? current : null;
  }

  private resolveAnomalyTargetId(object: THREE.Object3D): string | undefined {
    return this.options.anomalyTargets
      .getAll()
      .find((target) => target.object === object)?.id;
  }

  private setTransformMode(mode: LevelBuilderTransformMode): void {
    this.transformControls.setMode(mode);
  }

  private setSnapPreset(preset: LevelBuilderSnapPreset): void {
    const snap = LEVEL_BUILDER_SNAP_PRESETS[preset];
    this.transformControls.setTranslationSnap(snap.translation);
    this.transformControls.setRotationSnap(
      snap.rotationDegrees === null
        ? null
        : THREE.MathUtils.degToRad(snap.rotationDegrees),
    );
    this.transformControls.setScaleSnap(snap.scale);
  }

  private changeRoom(roomIndex: number): Promise<void> {
    if (
      this.layoutDirty &&
      !window.confirm(
        'This level has unexported layout changes. Switch levels and discard them?',
      )
    ) {
      return Promise.reject(
        new Error('Level change cancelled. Export the layout before switching.'),
      );
    }

    return this.options.onRoomChange(roomIndex);
  }

  private duplicateSelection(): void {
    const selection = this.session.getSelection();

    if (selection === null) {
      this.panel.setStatus('Select furniture before duplicating it.', true);
      return;
    }

    if (
      selection.reference.anomalyTargetId === undefined &&
      !this.session.isAddition(selection.object)
    ) {
      this.panel.setStatus(
        'Only registered furniture can be duplicated.',
        true,
      );
      return;
    }

    const copy = cloneFurnitureObject(selection.object);
    copy.name = this.createUniqueCopyName(selection.object.name || 'Object');
    selection.object.updateWorldMatrix(true, false);
    this.options.roomRoot.updateWorldMatrix(true, false);
    const localMatrix = this.options.roomRoot.matrixWorld
      .clone()
      .invert()
      .multiply(selection.object.matrixWorld);
    localMatrix.decompose(copy.position, copy.quaternion, copy.scale);
    copy.position.x += 0.5;
    this.options.roomRoot.add(copy);
    this.session.registerAddition(copy, selection.object);
    this.layoutDirty = true;
    this.selectObject(copy);
    this.panel.rebuildSceneHierarchy();
    this.options.onObjectChanged();
    this.panel.setStatus(`Added ${copy.name}.`);
  }

  private removeSelection(): void {
    const selection = this.session.getSelection();

    if (selection === null) {
      this.panel.setStatus('Select furniture before removing it.', true);
      return;
    }

    const { object, reference } = selection;
    this.transformControls.detach();
    this.selectionHelper.visible = false;

    if (this.session.isAddition(object)) {
      this.session.removeAddition(object);
      this.layoutDirty = true;
      this.originalStates.delete(object);
      disposeClonedMaterials(object);
      this.panel.rebuildSceneHierarchy();
      this.options.onObjectChanged();
      this.panel.setStatus(`Removed ${object.name || object.type}.`);
      return;
    }

    if (reference.anomalyTargetId === undefined) {
      this.transformControls.attach(object);
      this.selectionHelper.visible = true;
      this.panel.setStatus(
        'Walls, doors, and technical objects are protected.',
        true,
      );
      return;
    }

    object.visible = false;
    this.layoutDirty = true;
    this.session.captureAfter();
    this.session.select(null);
    this.options.onObjectChanged();
    this.panel.refresh();
    this.panel.setStatus(`Removed ${object.name || object.type} from the layout.`);
  }

  private createUniqueCopyName(sourceName: string): string {
    const baseName = `${sourceName}_Copy`;
    const existingNames = new Set(
      this.options.roomRoot.children.map((child) => child.name),
    );

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let suffix = 2;
    while (existingNames.has(`${baseName}_${String(suffix)}`)) {
      suffix += 1;
    }

    return `${baseName}_${String(suffix)}`;
  }

  private focusSelection(): void {
    const selection = this.session.getSelection();

    if (selection === null) {
      this.panel.setStatus('Select an object before framing it.', true);
      return;
    }

    const bounds = new THREE.Box3().setFromObject(selection.object);

    if (bounds.isEmpty()) {
      selection.object.getWorldPosition(this.orbitControls.target);
      return;
    }

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const direction = this.options.camera.position
      .clone()
      .sub(this.orbitControls.target)
      .normalize();
    const distance = Math.max(1.2, size.length() * 1.6);
    this.orbitControls.target.copy(center);
    this.options.camera.position.copy(center).addScaledVector(
      direction.lengthSq() > 0 ? direction : new THREE.Vector3(1, 0.7, 1),
      distance,
    );
    this.orbitControls.update();
  }

  private frameRoom(): void {
    const bounds = new THREE.Box3().setFromObject(this.options.roomRoot);

    if (bounds.isEmpty()) {
      return;
    }

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    this.orbitControls.target.copy(center);
    this.options.camera.position.set(
      center.x + size.x * 0.38,
      center.y + Math.min(size.y * 0.28, 1.6),
      center.z + size.z * 0.38,
    );
    this.options.camera.lookAt(center);
    this.options.camera.updateMatrixWorld(true);
    this.orbitControls.update();
  }

  private handleEditedObjectChanged(): void {
    this.layoutDirty = true;
    const selection = this.session.getSelection();

    if (selection !== null) {
      this.selectionHelper.setFromObject(selection.object);
    }

    this.options.onObjectChanged();
    this.panel.refresh();
  }

  private readonly handleTransformDraggingChanged = (
    event: { readonly value?: unknown },
  ): void => {
    const dragging = event.value === true;
    this.orbitControls.enabled = !dragging;

    if (dragging) {
      this.skipNextCanvasSelection = true;
    }
  };

  private readonly handleTransformObjectChange = (): void => {
    try {
      this.session.captureAfter();
      this.handleEditedObjectChanged();
    } catch {
      // TransformControls can emit while detaching during shutdown.
    }
  };

  private readonly handleCanvasPointerDown = (event: PointerEvent): void => {
    if (!this.openState || event.button !== 0) {
      return;
    }

    this.pointerDownPosition = new THREE.Vector2(event.clientX, event.clientY);
  };

  private readonly handleCanvasPointerUp = (event: PointerEvent): void => {
    if (
      !this.openState ||
      event.button !== 0 ||
      this.pointerDownPosition === null
    ) {
      return;
    }

    const distance = this.pointerDownPosition.distanceTo(
      new THREE.Vector2(event.clientX, event.clientY),
    );
    this.pointerDownPosition = null;

    if (this.skipNextCanvasSelection) {
      this.skipNextCanvasSelection = false;
      return;
    }

    if (
      distance > POINTER_CLICK_TOLERANCE_PX ||
      this.transformControls.axis !== null
    ) {
      return;
    }

    const bounds = this.options.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.options.camera);
    this.raycaster.layers.set(RENDER_LAYERS.scene);
    const intersection = this.raycaster.intersectObject(
      this.options.roomRoot,
      true,
    )[0];

    if (intersection !== undefined) {
      this.selectObject(intersection.object);
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.openState || isTextEditingTarget(event.target)) {
      return;
    }

    const modes: Readonly<Record<string, LevelBuilderTransformMode>> = {
      KeyW: 'translate',
      KeyE: 'rotate',
      KeyR: 'scale',
    };
    const mode = modes[event.code];

    if (mode !== undefined) {
      event.preventDefault();
      this.panel.setTransformMode(mode);
    }
  };
}

function isDescendantOf(object: THREE.Object3D, root: THREE.Object3D): boolean {
  let current = object.parent;

  while (current !== null) {
    if (current === root) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function cloneFurnitureObject(source: THREE.Object3D): THREE.Object3D {
  const clone = source.clone(true);
  const technicalObjects: THREE.Object3D[] = [];

  clone.traverse((object) => {
    if (object !== clone && isTechnicalEditorObject(object)) {
      technicalObjects.push(object);
    }
  });

  for (const object of technicalObjects) {
    object.removeFromParent();
  }

  clone.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }

    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
  });

  return clone;
}

function disposeClonedMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;

    if (!mesh.isMesh) {
      return;
    }

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        material.dispose();
      }
    } else {
      mesh.material.dispose();
    }
  });
}

function isTechnicalEditorObject(object: THREE.Object3D): boolean {
  return (
    object.name.startsWith('INTERACT_') ||
    object.name.startsWith('REPORT_') ||
    object.name.startsWith('COLLIDER_') ||
    object.name.startsWith('LEVEL_BUILDER_') ||
    (
      object.layers.isEnabled(RENDER_LAYERS.interaction) &&
      !object.layers.isEnabled(RENDER_LAYERS.scene)
    )
  );
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}
