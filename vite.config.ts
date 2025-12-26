import { dirname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import packageJSON from './package.json'
import { manifestPlugin } from './pipelines/webManifest/plugin'

const aliasRelMap: Record<string, string> = {
  '@core': './src/core',
  '@assets': './src/assets',
  '@components': './src/components',
  '@ui': './src/ui',
  '@utils': './src/utils',
  '@states': './src/states',
  '@vendors': './src/vendors',
}
const aliasMap: Record<string, string> = {}
for (const [key, relPath] of Object.entries(aliasRelMap)) {
  aliasMap[key] = fileURLToPath(new URL(relPath, import.meta.url))
}

const PYODIDE_EXCLUDE_DEV = ['!**/*.{md,html}', '!**/*.d.ts', '!**/*.whl', '!**/node_modules']
const PYODIDE_EXCLUDE_PROD = PYODIDE_EXCLUDE_DEV.concat(['!**/*.map'])
function viteStaticCopyPyodide(isDev: boolean) {
  const pyodideDir = dirname(fileURLToPath(import.meta.resolve('pyodide')))
  return viteStaticCopy({
    targets: [
      {
        src: [join(pyodideDir, '*').replace(/\\/g, '/')].concat(
          isDev ? PYODIDE_EXCLUDE_DEV : PYODIDE_EXCLUDE_PROD,
        ),
        dest: 'assets',
      },
    ],
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    manifestPlugin(),
    viteStaticCopyPyodide(mode === 'development'),
    vue(),
    visualizer({
      gzipSize: true,
      brotliSize: true,
      emitFile: false,
      filename: 'chunk-analysis.html',
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          primeui: ['primevue', '@primeuix/themes'],
          ui: ['wavesurfer.js', 'vue-draggable-plus', 'floating-vue', 'virtua'],
          vue: ['vue', 'pinia'],
          nlp: ['compromise', 'compromise-speech', 'compromise-syllables'],
          utils: ['lodash-es', 'nanoid', 'mitt'],
          codemirror: [
            'codemirror',
            '@codemirror/commands',
            '@codemirror/search',
            '@codemirror/state',
            '@codemirror/view',
          ],
          amll: [
            '@applemusic-like-lyrics/core',
            '@applemusic-like-lyrics/vue',
            '@pixi/app',
            '@pixi/core',
            '@pixi/display',
            '@pixi/filter-blur',
            '@pixi/filter-bulge-pinch',
            '@pixi/filter-color-matrix',
            '@pixi/sprite',
            'jss',
            'jss-preset-default',
          ],
        },
      },
      external: [
        'node:url',
        'node:fs',
        'node:fs/promises',
        'node:vm',
        'node:path',
        'node:crypto',
        'node:child_process',
      ],
    },
  },
  resolve: { alias: aliasMap },
  define: {
    __VERSION__: JSON.stringify(packageJSON.version),
  },
  optimizeDeps: { exclude: ['pyodide'] },
}))
