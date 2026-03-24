import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '');
    const djangoBackendUrl = env.DJANGO_BASE_URL || 'https://auraprod.unthink.ai';
    return {
        plugins: [
            react(),
            nodePolyfills({
                protocolImports: true,
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        define: {
            // Expose specific env variables to the client
            'process.env.DROPP_MERCHANT_ID': JSON.stringify(env.DROPP_MERCHANT_ID),
            'process.env.DROPP_ENVIRONMENT': JSON.stringify(env.DROPP_ENVIRONMENT),

            // Polyfill global for Hashgraph SDK if needed, though plugin handles some.
            // Often Hashgraph SDK checks for `global` specifically.
            'global': 'globalThis',
        },
        optimizeDeps: {
            esbuildOptions: {
                define: {
                    global: 'globalThis',
                },
            },
        },
        server: {
            port: 5173,
            proxy: {
                '/api': {
                    target: djangoBackendUrl,
                    changeOrigin: true,
                },
                '/get-authorize-url': {
                    target: djangoBackendUrl,
                    changeOrigin: true,
                },
                '/users': {
                    target: djangoBackendUrl,
                    changeOrigin: true,
                }
            }
        }
    };
});
