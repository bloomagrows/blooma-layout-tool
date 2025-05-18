import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: true,
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false
                }
              }
            },
            {
              name: 'prefixIds',
              params: {
                // This will prefix all IDs and classes with 'blooma-'
                prefix: 'blooma',
                // Ensure we prefix classes as well as IDs
                prefixClassNames: true
              }
            }
          ]
        },
        titleProp: true,
      },
      include: '**/*.svg',
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});