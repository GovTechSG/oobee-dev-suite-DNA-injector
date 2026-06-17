import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import oobeeVite from '@oobee/oobee-genome/adapters/vite'

export default defineConfig({
    plugins: [
        oobeeVite({ verbose: true }),
        react()
    ],
    server: {
        port: 5173
    }
})
