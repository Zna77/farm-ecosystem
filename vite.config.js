// Vite build settings.
//
// By default Vite targets Chrome 87+. Many Android phones (older Samsung
// Internet, in-app browsers built on an old Android System WebView) are below
// that, and a single unsupported syntax feature (like `?.`) stops the whole
// game from starting. Compiling down to ES2017 keeps the game working on
// Chrome 61+ / Android WebView 61+ / Samsung Internet 8+ / Safari 11+.
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: ['es2017', 'chrome61', 'safari11', 'firefox60', 'edge79'],
    // Also lower modern CSS syntax where esbuild can (e.g. `inset` → top/right/bottom/left).
    cssTarget: ['chrome61', 'safari11', 'firefox60', 'edge79'],
  },
});
