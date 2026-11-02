import type { VitePWAOptions } from 'vite-plugin-pwa';

/** Configuración de la PWA (manifest + service worker). Separada para poder probarla. */
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: ['icons/apple-touch-icon.png'],
  manifest: {
    name: 'Gestión de Iglesia',
    short_name: 'Iglesia',
    description: 'Administración de miembros, asistencia, eventos y donaciones de la iglesia.',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // Solo se precachea la interfaz (JS, CSS, HTML, íconos). Los datos de la API nunca se cachean,
    // para no mostrar información financiera o personal desactualizada u ofrecida sin sesión.
    globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
  },
};
