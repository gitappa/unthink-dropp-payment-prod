import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/plugin.js'),
            name: 'DroppWalletPlugin',
            fileName: (format) => `dropp-wallet-plugin.${format}.js`
        },
        cssCodeSplit: false,
        rollupOptions: {
            // Externalize deps that shouldn't be bundled into the library
            external: ['react', 'react-dom', '@hashgraph/hedera-wallet-connect', '@hashgraph/sdk'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    '@hashgraph/hedera-wallet-connect': 'HederaWalletConnect',
                    '@hashgraph/sdk': 'HashgraphSDK'
                },
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === 'style.css') return 'dropp-wallet-plugin.css';
                    return assetInfo.name;
                }
            }
        }
    }
});
