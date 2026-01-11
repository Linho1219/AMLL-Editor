import chalk from 'chalk'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

import { buildStylesheet } from './stylesheet'

const VIRTUAL_ID = 'virtual:iconify-icons.css'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

const manifestPath = path.resolve(process.cwd(), 'src/ui/icon/iconManifest.json')

const buildCSS = () => {
  try {
    const manifestJSON = fs.readFileSync(manifestPath, 'utf-8')
    return buildStylesheet(manifestJSON)
  } catch (e) {
    console.log(chalk.red(`[iconify-plugin] Failed to build icon CSS: ${String(e)}`))
    return ''
  }
}

export function iconifyPlugin(): Plugin {
  let css = buildCSS()
  return {
    name: 'iconify-icons-css',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) return css
    },
    configureServer(server) {
      server.watcher.add(manifestPath)
      server.watcher.on('change', (changedPath) => {
        if (path.resolve(changedPath) !== manifestPath) return
        css = buildCSS()
        server.watcher.emit('change', RESOLVED_VIRTUAL_ID)
      })
    },
  }
}
