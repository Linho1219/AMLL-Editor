import 'dotenv/config'
import type { Plugin } from 'vite'

import { generateManifest } from './generate'

const VIRTUAL_MANIFEST_FILENAME = 'app.webmanifest'
const VIRTUAL_MANIFEST_PATH = `/${VIRTUAL_MANIFEST_FILENAME}`

const SUFFIX = process.env.VITE_BUILD_CHANNEL === 'BETA' ? ' BETA' : ''
const INJECTED_HEAD = /* html */ `
  <link rel="manifest" href="${VIRTUAL_MANIFEST_PATH}">
  <title>AMLL Editor${SUFFIX}</title>
  <meta name="application-title" content="AMLL Editor${SUFFIX}" />
`

export function manifestPlugin(): Plugin {
  const manifest = generateManifest()

  return {
    name: 'vite-plugin-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== VIRTUAL_MANIFEST_PATH) return next()
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(JSON.stringify(manifest, null, 2))
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: VIRTUAL_MANIFEST_FILENAME,
        source: JSON.stringify(manifest, null, 2),
      })
    },
    transformIndexHtml(html) {
      return html.replace('</head>', `${INJECTED_HEAD}</head>`)
    },
  }
}
