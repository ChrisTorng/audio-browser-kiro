import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get API server configuration from environment or use defaults
  const apiServerHost = env.VITE_API_HOST || 'localhost';
  const apiServerPort = env.VITE_API_PORT || '3000';
  const apiTarget = `http://${apiServerHost}:${apiServerPort}`;

  return {
    plugins: [react()],
    root: './src/client',
    publicDir: '../../public',
    
    // Build configuration
    build: {
      outDir: '../../dist/client',
      emptyOutDir: true,
      sourcemap: mode === 'development',
      // Optimize build for production
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'react-window': ['react-window'],
          },
        },
      },
    },
    
    // Path aliases
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './src/shared'),
        '@client': path.resolve(__dirname, './src/client'),
      },
    },
    
    // Development server configuration
    server: {
      port: parseInt(env.VITE_DEV_PORT || '5173'),
      host: env.VITE_DEV_HOST || 'localhost',
      open: false,
      // Proxy API requests to Fastify backend
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
      },
    },
    
    // Preview server configuration (for testing production build)
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || '4173'),
      host: env.VITE_PREVIEW_HOST || 'localhost',
    },
    
    // Environment variable prefix (only variables with this prefix will be exposed to client)
    envPrefix: 'VITE_',
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '1.0.0'),
      __DEV__: mode === 'development',
    },
    
    // Test configuration (Vitest)
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          'dist/',
          '**/*.config.ts',
          '**/*.d.ts',
        ],
      },
    },
  };
});
