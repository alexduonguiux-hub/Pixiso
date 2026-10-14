import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `assets/` (CC0 vendor files) is served as the public directory, so
// `assets/vendor/kaykit-adventurers/Characters/gltf/Knight.glb` is reachable at
// `/vendor/kaykit-adventurers/Characters/gltf/Knight.glb` in dev and in the build.
const assetsDir = fileURLToPath(new URL('../../assets', import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: assetsDir,
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022' },
});
