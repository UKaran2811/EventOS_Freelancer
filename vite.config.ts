import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {spawn} from 'child_process';

// Start the Express server on port 3001 in development mode
if (process.env.NODE_ENV !== 'production' && !process.env.VITEST) {
  const g = global as any;
  if (!g.__expressStarted) {
    g.__expressStarted = true;
    console.log('[Fullstack Link] Spawning Express server on port 3001...');
    const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: '3001' }
    });
    
    process.on('exit', () => {
      serverProcess.kill();
    });
    process.on('SIGINT', () => {
      serverProcess.kill();
      process.exit();
    });
    process.on('SIGTERM', () => {
      serverProcess.kill();
      process.exit();
    });
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
