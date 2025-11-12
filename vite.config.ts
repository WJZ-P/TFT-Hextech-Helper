import {defineConfig} from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // 就叫 __dirname 吧！

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react({
            // 喵~ 我们在这里告诉 React 插件，
            // 在处理代码时，请额外使用 styled-components 的 Babel 插件
            babel: {
                plugins: [
                    'babel-plugin-styled-components',
                ],
            },
        }),
        electron({
            main: {
                // Shortcut of `build.lib.entry`.
                entry: 'electron/main.ts',
            },
            vite: {
                build: {
                    sourcemap: 'inline',   // ← 改这里
                    rollupOptions: {
                        output: {
                            // 强制 CJS 格式，解决 CJS/ESM 混合依赖问题
                            format: 'cjs',
                            // 强制输出文件名，不要 hash！
                            entryFileNames: 'main.js',
                            // 确保 chunk 和 asset 也不带 hash
                            chunkFileNames: '[name].js',
                            assetFileNames: '[name].[ext]'
                        }
                    }
                },
            },
            preload: {
                // Shortcut of `build.rollupOptions.input`.
                // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
                input: path.join(__dirname, 'electron/preload.ts'),
            },
            // Ployfill the Electron and Node.js API for Renderer process.
            // If you want to use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
            // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
            renderer: process.env.NODE_ENV === 'test'
                // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
                ? undefined
                : {},
        }),
    ],
    resolve: {
        alias: {
            '@mui/styled-engine': '@mui/styled-engine-sc',
            "@":path.resolve(__dirname,'src')
        }
    }
})
