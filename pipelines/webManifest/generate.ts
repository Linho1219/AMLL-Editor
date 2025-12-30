import 'dotenv/config'

import FORMAT_MENIFEST from '../../src/core/convert/manifest.json'
import SOURCE from './source.json'

export function generateManifest() {
  const accept: Record<string, string[]> = {}
  for (const [, format] of Object.entries(FORMAT_MENIFEST)) {
    accept[format.mime] = format.accept
  }
  const manifest = {
    ...SOURCE,
    file_handlers: [{ action: './', accept }],
  }
  if (process.env.VITE_BUILD_CHANNEL === 'BETA') {
    manifest.name += ' BETA'
    manifest.short_name += '-beta'
  }
  return manifest
}
