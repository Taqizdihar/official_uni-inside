import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {resolveApiBase} from './src/config/resolveApiBase';

export default defineConfig(({command,mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  resolveApiBase({VITE_API_BASE_URL: env.VITE_API_BASE_URL ?? process.env.VITE_API_BASE_URL}, command === 'build');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    assetsInclude: ['**/*.glb', '**/*.hdr'],
  };
});
