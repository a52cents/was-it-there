export function registerServiceWorker(): void {
  const configuredPlatform =
    import.meta.env.VITE_PLATFORM?.trim().toLowerCase() || 'standalone';

  if (
    !import.meta.env.PROD ||
    configuredPlatform !== 'standalone' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  window.addEventListener(
    'load',
    () => {
      const serviceWorkerUrl = new URL('./sw.js', document.baseURI);
      const scope = new URL('./', document.baseURI).pathname;
      void navigator.serviceWorker.register(serviceWorkerUrl, { scope }).catch(
        (error: unknown) => {
          console.warn('PWA service worker registration failed.', error);
        },
      );
    },
    { once: true },
  );
}
