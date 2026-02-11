import {resolve} from 'path'
import {defineConfig, externalizeDepsPlugin} from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                // 告诉它入口是你的 "main.ts"
                input: resolve(__dirname, 'electron/main.ts'),
                output: {
                    // 告诉它输出的文件名 *必须* 叫 "index.js"！
                    // (这样 Dev Server 才能找到它！)
                    entryFileNames: 'index.js'
                },
            }
        },
    },
    preload: {
        input: resolve(__dirname, 'electron/preload.ts'),
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'electron/preload.ts'),
                output: {
                    dir: resolve(__dirname, 'out/preload'),
                    entryFileNames: '[name].cjs',
                    format: 'cjs'
                }
            }
        }
    },
    renderer: {
        root: resolve(__dirname, 'src'), // dev模式下，index.html所在的目录
        resolve: {  // renderer（你的React src/）
            alias: {
                "@": resolve(__dirname, 'src'),  // 你的src别名
                '@mui/styled-engine': '@mui/styled-engine-sc',  // 你的MUI
            }
        },
        build: {
            rollupOptions: {
                // 告诉它 React App 的入口 HTML
                // 多页面构建：主应用 + 游戏浮窗
                input: {
                    index: resolve(__dirname, 'src/index.html'),
                    overlay: resolve(__dirname, 'src/overlay/overlay.html'),
                },
            }
        },
        plugins: [react({
            babel: {  // 保留你的styled-components babel
                plugins: ['babel-plugin-styled-components'],
            },
        })]
    }
})

