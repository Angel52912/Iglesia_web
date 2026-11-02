import { describe, expect, it } from 'vitest';
import { pwaOptions } from '../pwa.config';

describe('configuración PWA', () => {
  const manifest = pwaOptions.manifest;

  it('es instalable: standalone, start_url e íconos 192 y 512', () => {
    expect(manifest).toBeTruthy();
    if (!manifest) return;
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    const tamanos = (manifest.icons ?? []).map((i) => i.sizes);
    expect(tamanos).toContain('192x192');
    expect(tamanos).toContain('512x512');
    expect((manifest.icons ?? []).some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('el service worker no intercepta rutas /api', () => {
    const denegadas = pwaOptions.workbox?.navigateFallbackDenylist ?? [];
    expect(denegadas.some((r) => r.test('/api/donations'))).toBe(true);
  });
});
