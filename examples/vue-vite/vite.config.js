import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { oobeeVitePlugin } from '@govtechsg/oobee-genome/adapters/vite';

export default defineConfig({
    plugins: [
        oobeeVitePlugin({
            verbose: false,
            includePatterns: [/\.(vue|js)$/]
        }),
        vue()
    ],
    server: {
        port: 5180
    }
});
