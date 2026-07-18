import * as THREE from 'three';
import {
  LEVEL_BUILDER_VARIANT_KINDS,
  parseLevelBuilderDocument,
  serializeLevelBuilderDocument,
  type LevelBuilderVariantKind,
} from './LevelBuilderDocument';
import { serializeLevelBuilderLayoutDocument } from './LevelBuilderLayoutDocument';
import type { LevelBuilderSession } from './LevelBuilderSession';

export type LevelBuilderTransformMode = 'translate' | 'rotate' | 'scale';

export interface LevelBuilderPanelOptions {
  readonly roomRoot: THREE.Object3D;
  readonly session: LevelBuilderSession;
  readonly onClose: () => void;
  readonly onSelectObject: (object: THREE.Object3D) => void;
  readonly onTransformModeChange: (mode: LevelBuilderTransformMode) => void;
  readonly onFocusSelection: () => void;
  readonly onObjectChanged: () => void;
}

export class LevelBuilderPanel {
  private readonly element: HTMLElement;
  private readonly hierarchy: HTMLElement;
  private readonly selectionName: HTMLElement;
  private readonly selectionDetails: HTMLElement;
  private readonly modeButtons = new Map<
    LevelBuilderTransformMode,
    HTMLButtonElement
  >();
  private readonly visibilityInput: HTMLInputElement;
  private readonly colorInput: HTMLInputElement;
  private readonly variantIdInput: HTMLInputElement;
  private readonly variantKindSelect: HTMLSelectElement;
  private readonly variantsList: HTMLElement;
  private readonly status: HTMLElement;
  private readonly importInput: HTMLInputElement;
  private readonly hierarchyButtons = new Map<string, HTMLButtonElement>();

  public constructor(
    root: HTMLElement,
    private readonly options: LevelBuilderPanelOptions,
  ) {
    const document = root.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'level-builder-panel';
    this.element.hidden = true;

    const header = document.createElement('header');
    const titleGroup = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.textContent = 'DEVELOPMENT TOOL';
    const title = document.createElement('h2');
    title.textContent = 'LEVEL BUILDER';
    titleGroup.append(eyebrow, title);
    const closeButton = this.createButton(document, 'CLOSE', 'danger');
    closeButton.addEventListener('click', this.handleClose);
    header.append(titleGroup, closeButton);

    const selectionSection = this.createSection(document, 'SELECTION');
    this.selectionName = document.createElement('strong');
    this.selectionName.className = 'level-builder-selection-name';
    this.selectionName.textContent = 'No object selected';
    this.selectionDetails = document.createElement('pre');
    this.selectionDetails.className = 'level-builder-selection-details';
    const focusButton = this.createButton(document, 'FRAME SELECTED');
    focusButton.addEventListener('click', this.handleFocusSelection);
    selectionSection.append(
      this.selectionName,
      this.selectionDetails,
      focusButton,
    );

    const transformSection = this.createSection(document, 'TRANSFORM GIZMO');
    const transformToolbar = document.createElement('div');
    transformToolbar.className = 'level-builder-toolbar';

    for (const [mode, label] of [
      ['translate', 'W MOVE'],
      ['rotate', 'E ROTATE'],
      ['scale', 'R SCALE'],
    ] as const) {
      const button = this.createButton(document, label);
      button.dataset.mode = mode;
      button.addEventListener('click', () => this.setTransformMode(mode));
      this.modeButtons.set(mode, button);
      transformToolbar.append(button);
    }

    transformSection.append(transformToolbar);

    const stateSection = this.createSection(document, 'BEFORE / AFTER');
    const stateToolbar = document.createElement('div');
    stateToolbar.className = 'level-builder-toolbar';
    const captureBefore = this.createButton(document, 'CAPTURE BEFORE');
    captureBefore.addEventListener('click', this.handleCaptureBefore);
    const captureAfter = this.createButton(document, 'CAPTURE AFTER');
    captureAfter.addEventListener('click', this.handleCaptureAfter);
    const previewBefore = this.createButton(document, 'PREVIEW BEFORE');
    previewBefore.addEventListener('click', this.handlePreviewBefore);
    const previewAfter = this.createButton(document, 'PREVIEW AFTER');
    previewAfter.addEventListener('click', this.handlePreviewAfter);
    stateToolbar.append(
      captureBefore,
      captureAfter,
      previewBefore,
      previewAfter,
    );

    const propertyGrid = document.createElement('div');
    propertyGrid.className = 'level-builder-property-grid';
    const visibilityLabel = document.createElement('label');
    visibilityLabel.textContent = 'VISIBLE';
    this.visibilityInput = document.createElement('input');
    this.visibilityInput.type = 'checkbox';
    this.visibilityInput.addEventListener(
      'change',
      this.handleVisibilityChange,
    );
    visibilityLabel.append(this.visibilityInput);
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'COLOR';
    this.colorInput = document.createElement('input');
    this.colorInput.type = 'color';
    this.colorInput.value = '#ffffff';
    this.colorInput.addEventListener('input', this.handleColorInput);
    colorLabel.append(this.colorInput);
    propertyGrid.append(visibilityLabel, colorLabel);
    stateSection.append(stateToolbar, propertyGrid);

    const variantSection = this.createSection(document, 'ANOMALY VARIANT');
    this.variantIdInput = document.createElement('input');
    this.variantIdInput.type = 'text';
    this.variantIdInput.placeholder = 'example: chair-moved';
    this.variantIdInput.setAttribute('aria-label', 'Variant id');
    this.variantKindSelect = document.createElement('select');
    this.variantKindSelect.setAttribute('aria-label', 'Variant kind');

    for (const kind of LEVEL_BUILDER_VARIANT_KINDS) {
      const option = document.createElement('option');
      option.value = kind;
      option.textContent = kind.toUpperCase();
      this.variantKindSelect.append(option);
    }

    const saveVariant = this.createButton(document, 'VALIDATE + SAVE', 'primary');
    saveVariant.addEventListener('click', this.handleSaveVariant);
    variantSection.append(
      this.variantIdInput,
      this.variantKindSelect,
      saveVariant,
    );

    const variantsSection = this.createSection(document, 'SAVED VARIANTS');
    this.variantsList = document.createElement('div');
    this.variantsList.className = 'level-builder-variants';
    variantsSection.append(this.variantsList);

    const ioSection = this.createSection(document, 'JSON');
    const ioToolbar = document.createElement('div');
    ioToolbar.className = 'level-builder-toolbar';
    const exportLayoutButton = this.createButton(
      document,
      'EXPORT LAYOUT',
      'primary',
    );
    exportLayoutButton.addEventListener('click', this.handleExportLayout);
    const exportButton = this.createButton(document, 'EXPORT ANOMALIES');
    exportButton.addEventListener('click', this.handleExport);
    const importButton = this.createButton(document, 'IMPORT ANOMALIES');
    importButton.addEventListener('click', this.handleImportClick);
    this.importInput = document.createElement('input');
    this.importInput.type = 'file';
    this.importInput.accept = 'application/json,.json';
    this.importInput.hidden = true;
    this.importInput.addEventListener('change', this.handleImportFile);
    ioToolbar.append(
      exportLayoutButton,
      exportButton,
      importButton,
      this.importInput,
    );
    ioSection.append(ioToolbar);

    const hierarchySection = this.createSection(document, 'SCENE HIERARCHY');
    hierarchySection.classList.add('level-builder-hierarchy-section');
    this.hierarchy = document.createElement('div');
    this.hierarchy.className = 'level-builder-hierarchy';
    hierarchySection.append(this.hierarchy);

    this.status = document.createElement('p');
    this.status.className = 'level-builder-status';
    this.status.textContent = 'Ready.';

    this.element.append(
      header,
      selectionSection,
      transformSection,
      stateSection,
      variantSection,
      variantsSection,
      ioSection,
      hierarchySection,
      this.status,
    );
    root.append(this.element);
    this.rebuildHierarchy();
    this.setTransformMode('translate');
    this.refresh();
  }

  public show(): void {
    this.element.hidden = false;
    this.rebuildHierarchy();
    this.refresh();
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public refresh(): void {
    const selection = this.options.session.getSelection();

    if (selection === null) {
      this.selectionName.textContent = 'No object selected';
      this.selectionDetails.textContent =
        'Click an object in the viewport or hierarchy.';
      this.visibilityInput.checked = false;
      this.visibilityInput.disabled = true;
      this.colorInput.disabled = true;
    } else {
      const { object, reference } = selection;
      const rotationDegrees = object.rotation
        .toArray()
        .slice(0, 3)
        .map((value) => THREE.MathUtils.radToDeg(value as number));
      this.selectionName.textContent = reference.anomalyTargetId === undefined
        ? reference.name
        : `${reference.name}  [${reference.anomalyTargetId}]`;
      this.selectionDetails.textContent = [
        `position  ${formatVector(object.position.toArray())}`,
        `rotation  ${formatVector(rotationDegrees)}`,
        `scale     ${formatVector(object.scale.toArray())}`,
        `path      ${formatPath(reference.path)}`,
      ].join('\n');
      this.visibilityInput.disabled = false;
      this.visibilityInput.checked = object.visible;
      const color = selection.after.materialColors[0]?.color;
      this.colorInput.disabled = color === undefined;

      if (color !== undefined) {
        this.colorInput.value = color;
      }
    }

    for (const [uuid, button] of this.hierarchyButtons) {
      button.dataset.selected = String(selection?.object.uuid === uuid);
    }

    this.refreshVariants();
  }

  public setStatus(message: string, error = false): void {
    this.status.textContent = message;
    this.status.dataset.error = String(error);
  }

  public setTransformMode(mode: LevelBuilderTransformMode): void {
    for (const [buttonMode, button] of this.modeButtons) {
      button.dataset.active = String(buttonMode === mode);
    }

    this.options.onTransformModeChange(mode);
  }

  public dispose(): void {
    this.visibilityInput.removeEventListener(
      'change',
      this.handleVisibilityChange,
    );
    this.colorInput.removeEventListener('input', this.handleColorInput);
    this.importInput.removeEventListener('change', this.handleImportFile);
    this.element.remove();
  }

  private rebuildHierarchy(): void {
    this.hierarchy.replaceChildren();
    this.hierarchyButtons.clear();

    for (const child of this.options.roomRoot.children) {
      this.appendHierarchyObject(child, 0);
    }
  }

  private appendHierarchyObject(object: THREE.Object3D, depth: number): void {
    if (isEditorExcludedObject(object)) {
      return;
    }

    const button = this.createButton(
      this.element.ownerDocument,
      object.name || object.type,
    );
    button.classList.add('level-builder-hierarchy-item');
    button.style.setProperty('--tree-depth', String(depth));
    button.title = `${object.type} · ${object.uuid}`;
    button.addEventListener('click', () => {
      this.options.onSelectObject(object);
    });
    this.hierarchyButtons.set(object.uuid, button);
    this.hierarchy.append(button);

    for (const child of object.children) {
      this.appendHierarchyObject(child, depth + 1);
    }
  }

  private refreshVariants(): void {
    this.variantsList.replaceChildren();
    const variants = this.options.session.getVariants();

    if (variants.length === 0) {
      const empty = this.element.ownerDocument.createElement('span');
      empty.textContent = 'No saved variants.';
      this.variantsList.append(empty);
      return;
    }

    for (const variant of variants) {
      const row = this.element.ownerDocument.createElement('div');
      const label = this.element.ownerDocument.createElement('span');
      label.textContent = `${variant.id} · ${variant.kind} · ${variant.target.name}`;
      const remove = this.createButton(
        this.element.ownerDocument,
        'DELETE',
        'danger',
      );
      remove.addEventListener('click', () => {
        this.options.session.deleteVariant(variant.id);
        this.refreshVariants();
        this.setStatus(`Deleted ${variant.id}.`);
      });
      row.append(label, remove);
      this.variantsList.append(row);
    }
  }

  private createSection(document: Document, title: string): HTMLElement {
    const section = document.createElement('section');
    section.className = 'level-builder-section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);
    return section;
  }

  private createButton(
    document: Document,
    label: string,
    tone: 'default' | 'primary' | 'danger' = 'default',
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.tone = tone;
    return button;
  }

  private readonly handleClose = (): void => {
    this.options.onClose();
  };

  private readonly handleFocusSelection = (): void => {
    this.options.onFocusSelection();
  };

  private readonly handleCaptureBefore = (): void => {
    try {
      this.options.session.captureBefore();
      this.setStatus('Captured BEFORE state.');
      this.refresh();
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handleCaptureAfter = (): void => {
    try {
      this.options.session.captureAfter();
      this.setStatus('Captured AFTER state.');
      this.refresh();
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handlePreviewBefore = (): void => {
    try {
      this.options.session.previewBefore();
      this.options.onObjectChanged();
      this.setStatus('Previewing BEFORE state.');
      this.refresh();
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handlePreviewAfter = (): void => {
    try {
      this.options.session.previewAfter();
      this.options.onObjectChanged();
      this.setStatus('Previewing AFTER state.');
      this.refresh();
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handleVisibilityChange = (): void => {
    try {
      this.options.session.setSelectedVisibility(
        this.visibilityInput.checked,
      );
      this.options.onObjectChanged();
      this.setStatus(
        this.visibilityInput.checked ? 'Object shown.' : 'Object hidden.',
      );
      this.refresh();
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handleColorInput = (): void => {
    try {
      const count = this.options.session.setSelectedColor(
        this.colorInput.value,
      );
      this.options.onObjectChanged();
      this.setStatus(`Changed ${count} color material${count === 1 ? '' : 's'}.`);
      this.refresh();
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handleSaveVariant = (): void => {
    try {
      const kind = this.variantKindSelect.value as LevelBuilderVariantKind;
      const validation = this.options.session.saveVariant(
        this.variantIdInput.value,
        kind,
      );

      if (!validation.valid) {
        this.setStatus(validation.errors.join(' '), true);
        return;
      }

      this.setStatus(`Saved variant ${this.variantIdInput.value.trim()}.`);
      this.refreshVariants();
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handleExport = (): void => {
    try {
      const document = this.options.session.createDocument();
      this.downloadJson(
        serializeLevelBuilderDocument(document),
        `${document.roomId}-anomalies.json`,
      );
      this.setStatus('Exported anomaly variants.');
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handleExportLayout = (): void => {
    try {
      const document = this.options.session.createLayoutDocument();
      this.downloadJson(
        serializeLevelBuilderLayoutDocument(document),
        `${document.roomId}-layout.json`,
      );
      this.setStatus(
        `Exported ${document.objects.length} canonical object transforms.`,
      );
    } catch (error: unknown) {
      this.showError(error);
    }
  };

  private readonly handleImportClick = (): void => {
    this.importInput.click();
  };

  private readonly handleImportFile = (): void => {
    const file = this.importInput.files?.[0];

    if (file === undefined) {
      return;
    }

    void file
      .text()
      .then((source) => {
        this.options.session.importDocument(
          parseLevelBuilderDocument(source),
        );
        this.refreshVariants();
        this.setStatus(`Imported ${file.name}.`);
      })
      .catch((error: unknown) => this.showError(error))
      .finally(() => {
        this.importInput.value = '';
      });
  };

  private showError(error: unknown): void {
    this.setStatus(
      error instanceof Error ? error.message : String(error),
      true,
    );
  }

  private downloadJson(source: string, fileName: string): void {
    const blob = new Blob([source], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = this.element.ownerDocument.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

function formatVector(values: readonly number[]): string {
  return values.map((value) => value.toFixed(3)).join(', ');
}

function formatPath(
  path: readonly { readonly name: string; readonly occurrence: number }[],
): string {
  return path.length === 0
    ? '/'
    : path
        .map((segment) => `${segment.name}[${segment.occurrence}]`)
        .join('/');
}

function isEditorExcludedObject(object: THREE.Object3D): boolean {
  return (
    object.name.startsWith('INTERACT_') ||
    object.name.startsWith('LEVEL_BUILDER_') ||
    object.name.startsWith('REPORT_')
  );
}
