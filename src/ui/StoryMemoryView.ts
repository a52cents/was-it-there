import { STORY_LOOP_ANCHOR } from '../content/story/StoryLoopAnchor';

export const STORY_SCREEN_EFFECT_IDS = [
  'bedroom-empty-place',
  'bathroom-condensation-failure',
  'corridor-ringing-failure',
  'office-erased-name',
  'kitchen-service-ticket',
  'dining-reconstruction',
] as const;
export type StoryScreenEffectId =
  (typeof STORY_SCREEN_EFFECT_IDS)[number];

const STORY_MEMORY_DURATION_MS = 3_400;

export class StoryMemoryView {
  private readonly element: HTMLElement;
  private remainingMs = 0;
  private paused = false;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('aside');
    this.element.className = 'story-memory';
    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');

    const photograph = document.createElement('div');
    photograph.className = 'story-memory__photograph';
    const figures = document.createElement('div');
    figures.className = 'story-memory__figures';

    for (let index = 0; index < 4; index += 1) {
      const figure = document.createElement('span');
      figure.className =
        index === 2
          ? 'story-memory__figure is-missing'
          : 'story-memory__figure';
      figures.append(figure);
    }

    const caption = document.createElement('p');
    caption.className = 'story-memory__caption';
    caption.textContent = 'FAMILY RECORD // SUBJECT MISSING';
    photograph.append(figures, caption);

    const condensation = document.createElement('div');
    condensation.className = 'story-memory__condensation';
    const warning = document.createElement('p');
    warning.textContent = STORY_LOOP_ANCHOR.displayTime;
    condensation.append(warning);

    const ringing = document.createElement('div');
    ringing.className = 'story-memory__ringing';
    const ringCore = document.createElement('span');
    ringCore.setAttribute('aria-hidden', 'true');
    const ringingCaption = document.createElement('p');
    ringingCaption.textContent = `NO CALLER // ${STORY_LOOP_ANCHOR.displayTime}`;
    ringing.append(ringCore, ringingCaption);

    const officeRecord = document.createElement('div');
    officeRecord.className = 'story-memory__office-record';
    const recordLabel = document.createElement('span');
    recordLabel.textContent = 'RESIDENT RECORD // SUBJECT 04';
    const erasedName = document.createElement('p');
    erasedName.textContent = 'NAME // ███████████';
    const recordTime = document.createElement('time');
    recordTime.textContent = STORY_LOOP_ANCHOR.displayTime;
    officeRecord.append(recordLabel, erasedName, recordTime);

    const serviceTicket = document.createElement('div');
    serviceTicket.className = 'story-memory__service-ticket';
    const serviceLabel = document.createElement('span');
    serviceLabel.textContent = 'KITCHEN SERVICE // TABLE 04';
    const places = document.createElement('ol');

    for (const copy of [
      'PLACE 01 // SERVED',
      'PLACE 02 // SERVED',
      'PLACE 03 // SERVED',
      'PLACE 04 // REMOVED BEFORE SERVICE',
    ]) {
      const place = document.createElement('li');
      place.textContent = copy;
      places.append(place);
    }

    const serviceTime = document.createElement('time');
    serviceTime.textContent = STORY_LOOP_ANCHOR.displayTime;
    serviceTicket.append(serviceLabel, places, serviceTime);

    const reconstruction = document.createElement('div');
    reconstruction.className = 'story-memory__reconstruction';
    const reconstructionLabel = document.createElement('span');
    reconstructionLabel.textContent = 'DOMESTIC ARCHIVE // SUBJECT 04';
    const reconstructionName = document.createElement('strong');
    reconstructionName.textContent = 'ELISE VALE';
    const reconstructionStatus = document.createElement('p');
    reconstructionStatus.textContent = 'DECEASED 03:04 // RECONSTRUCTION ACTIVE';
    const reconstructionSource = document.createElement('small');
    reconstructionSource.textContent =
      'SOURCE: PHOTOGRAPHS / ROUTINES / FAMILY RESIDUE / PRIOR LOOPS';
    reconstruction.append(
      reconstructionLabel,
      reconstructionName,
      reconstructionStatus,
      reconstructionSource,
    );

    this.element.append(
      photograph,
      condensation,
      ringing,
      officeRecord,
      serviceTicket,
      reconstruction,
    );
    root.append(this.element);
  }

  public show(effectId: StoryScreenEffectId): void {
    this.element.hidden = true;
    void this.element.offsetWidth;
    this.element.dataset.effect = effectId;
    this.remainingMs = STORY_MEMORY_DURATION_MS;
    this.element.hidden = false;
  }

  public update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError(
        'Story memory delta must be finite and non-negative.',
      );
    }

    if (this.paused || this.element.hidden) {
      return;
    }

    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);

    if (this.remainingMs === 0) {
      this.hide();
    }
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public hide(): void {
    this.remainingMs = 0;
    this.element.hidden = true;
    delete this.element.dataset.effect;
  }

  public reset(): void {
    this.paused = false;
    this.hide();
  }

  public dispose(): void {
    this.reset();
    this.element.remove();
  }
}
