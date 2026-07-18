const ROOM_COMPLETE_DURATION_MS = 2_400;

export class RoomCompleteBanner {
  private readonly element: HTMLElement;
  private visibleUntil = 0;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'room-complete-banner';
    this.element.hidden = true;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');

    const panel = document.createElement('div');
    panel.className = 'room-complete-banner__panel';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'room-complete-banner__eyebrow';
    eyebrow.textContent = 'OBSERVATION CONFIRMED';

    const title = document.createElement('strong');
    title.className = 'room-complete-banner__title';
    title.textContent = 'ROOM CLEARED';

    const instruction = document.createElement('p');
    instruction.className = 'room-complete-banner__instruction';
    instruction.textContent = 'THE EXIT IS OPEN';

    panel.append(eyebrow, title, instruction);
    this.element.append(panel);
    root.append(this.element);
  }

  public show(now = performance.now()): void {
    this.visibleUntil = now + ROOM_COMPLETE_DURATION_MS;
    this.element.hidden = false;
  }

  public update(now = performance.now()): void {
    if (!this.element.hidden && now >= this.visibleUntil) {
      this.element.hidden = true;
    }
  }

  public reset(): void {
    this.visibleUntil = 0;
    this.element.hidden = true;
  }

  public dispose(): void {
    this.element.remove();
  }
}
