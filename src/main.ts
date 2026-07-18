import './styles/main.css';
import { GameApp, type GameAppElements } from './app/GameApp';
import type { PlatformAdapter } from './platform/PlatformAdapter';
import { PlatformManager } from './platform/PlatformManager';
import { StandaloneAdapter } from './platform/adapters/StandaloneAdapter';

function getGameAppElements(): GameAppElements {
  const canvas = document.querySelector('#game-canvas');
  const hudLayer = document.querySelector('#hud-layer');
  const menuLayer = document.querySelector('#menu-layer');
  const modalLayer = document.querySelector('#modal-layer');
  const title = document.querySelector('#game-title');
  const playButton = document.querySelector('#play-button');
  const pointerLockPrompt = document.querySelector('#pointer-lock-prompt');

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Missing #game-canvas element.');
  }

  if (!(menuLayer instanceof HTMLElement)) {
    throw new Error('Missing #menu-layer element.');
  }

  if (!(hudLayer instanceof HTMLElement)) {
    throw new Error('Missing #hud-layer element.');
  }

  if (!(modalLayer instanceof HTMLElement)) {
    throw new Error('Missing #modal-layer element.');
  }

  if (!(title instanceof HTMLHeadingElement)) {
    throw new Error('Missing #game-title element.');
  }

  if (!(playButton instanceof HTMLButtonElement)) {
    throw new Error('Missing #play-button element.');
  }

  if (!(pointerLockPrompt instanceof HTMLButtonElement)) {
    throw new Error('Missing #pointer-lock-prompt element.');
  }

  return {
    canvas,
    hudLayer,
    menuLayer,
    modalLayer,
    title,
    playButton,
    pointerLockPrompt,
  };
}

function createPlatformAdapter(): PlatformAdapter {
  const configuredPlatform =
    import.meta.env.VITE_PLATFORM?.trim().toLowerCase() || 'standalone';

  if (configuredPlatform !== 'standalone' && import.meta.env.DEV) {
    console.warn(
      `Unsupported VITE_PLATFORM "${configuredPlatform}"; using "standalone".`,
    );
  }

  return new StandaloneAdapter();
}

function showBootError(error: unknown): void {
  const modalLayer = document.querySelector('#modal-layer');

  if (modalLayer instanceof HTMLElement) {
    modalLayer.textContent =
      'THE GAME COULD NOT START. CHECK WEBGL SUPPORT AND TRY AGAIN.';
    modalLayer.classList.add('boot-error');
  }

  console.error('Was It There? failed to initialize.', error);
}

async function bootstrap(): Promise<void> {
  const platformManager = new PlatformManager(createPlatformAdapter());
  const gameApp = new GameApp(getGameAppElements(), platformManager);

  window.addEventListener('pagehide', () => gameApp.dispose(), { once: true });
  await gameApp.initialize();
}

void bootstrap().catch(showBootError);
