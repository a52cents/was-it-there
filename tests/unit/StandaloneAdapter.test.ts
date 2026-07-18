import { describe, expect, it } from 'vitest';
import { StandaloneAdapter } from '../../src/platform/adapters/StandaloneAdapter';

describe('StandaloneAdapter', () => {
  it('initializes without external work', async () => {
    const adapter = new StandaloneAdapter(() => undefined);

    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('reports that rewarded ads are unavailable', async () => {
    const adapter = new StandaloneAdapter(() => undefined);

    await expect(adapter.requestRewardedAd()).resolves.toBe(false);
  });

  it('uses the browser locale and falls back to English', () => {
    const localizedAdapter = new StandaloneAdapter(() => ({
      language: 'fr-FR',
      userAgent: 'Desktop Browser',
    }));
    const fallbackAdapter = new StandaloneAdapter(() => undefined);

    expect(localizedAdapter.getLocale()).toBe('fr-FR');
    expect(fallbackAdapter.getLocale()).toBe('en');
  });

  it('accepts an escape time without rejecting', async () => {
    const adapter = new StandaloneAdapter(() => undefined);

    await expect(adapter.submitEscapeTime(12_345)).resolves.toBeUndefined();
  });
});
