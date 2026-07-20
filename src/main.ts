import "./styles/main.css";
import "./styles/start-screen.css";
import { GameApp, type GameAppElements } from "./app/GameApp";
import type { PlatformAdapter } from "./platform/PlatformAdapter";
import { PlatformManager } from "./platform/PlatformManager";
import { CrazyGamesAdapter } from "./platform/adapters/CrazyGamesAdapter";
import { StandaloneAdapter } from "./platform/adapters/StandaloneAdapter";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

function getGameAppElements(): GameAppElements {
  const canvas = document.querySelector("#game-canvas");
  const hudLayer = document.querySelector("#hud-layer");
  const menuLayer = document.querySelector("#menu-layer");
  const modalLayer = document.querySelector("#modal-layer");
  const title = document.querySelector("#game-title");
  const playButton = document.querySelector("#play-button");
  const storyModeButton = document.querySelector("#story-mode-button");
  const escapeModeButton = document.querySelector("#escape-mode-button");
  const escapeModeDescription = document.querySelector(
    "#escape-mode-description",
  );
  const storyNotebookButton = document.querySelector("#story-notebook-button");
  const pointerLockPrompt = document.querySelector("#pointer-lock-prompt");

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Missing #game-canvas element.");
  }

  if (!(menuLayer instanceof HTMLElement)) {
    throw new Error("Missing #menu-layer element.");
  }

  if (!(hudLayer instanceof HTMLElement)) {
    throw new Error("Missing #hud-layer element.");
  }

  if (!(modalLayer instanceof HTMLElement)) {
    throw new Error("Missing #modal-layer element.");
  }

  if (!(title instanceof HTMLHeadingElement)) {
    throw new Error("Missing #game-title element.");
  }

  if (!(playButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #play-button element.");
  }

  if (!(storyModeButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #story-mode-button element.");
  }

  if (!(escapeModeButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #escape-mode-button element.");
  }

  if (!(escapeModeDescription instanceof HTMLElement)) {
    throw new Error("Missing #escape-mode-description element.");
  }

  if (!(storyNotebookButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #story-notebook-button element.");
  }

  if (!(pointerLockPrompt instanceof HTMLButtonElement)) {
    throw new Error("Missing #pointer-lock-prompt element.");
  }

  return {
    canvas,
    hudLayer,
    menuLayer,
    modalLayer,
    title,
    playButton,
    storyModeButton,
    escapeModeButton,
    escapeModeDescription,
    storyNotebookButton,
    pointerLockPrompt,
  };
}

function createPlatformAdapter(): PlatformAdapter {
  const configuredPlatform =
    import.meta.env.VITE_PLATFORM?.trim().toLowerCase() || "standalone";

  if (configuredPlatform === "crazygames") {
    return new CrazyGamesAdapter({
      rewardedAdsEnabled:
        import.meta.env.VITE_CRAZYGAMES_REWARDED_ADS === "true",
    });
  }

  if (configuredPlatform !== "standalone" && import.meta.env.DEV) {
    console.warn(
      `Unsupported VITE_PLATFORM "${configuredPlatform}"; using "standalone".`,
    );
  }

  return new StandaloneAdapter();
}

function showBootError(error: unknown): void {
  const modalLayer = document.querySelector("#modal-layer");

  if (modalLayer instanceof HTMLElement) {
    modalLayer.textContent =
      "THE GAME COULD NOT START. CHECK WEBGL SUPPORT AND TRY AGAIN.";
    modalLayer.classList.add("boot-error");
  }

  console.error("Was It There? failed to initialize.", error);
}

async function bootstrap(): Promise<void> {
  const platformManager = new PlatformManager(createPlatformAdapter());
  const gameApp = new GameApp(getGameAppElements(), platformManager);

  window.addEventListener("pagehide", () => gameApp.dispose(), { once: true });
  await gameApp.initialize();
}

registerServiceWorker();
void bootstrap().catch(showBootError);
