import SOURCE from './source.json'
import FORMAT_MENIFEST from '../../src/core/convert/manifest.json'

export function generateManifest() {
  const accept: Record<string, string[]> = {}
  for (const [, format] of Object.entries(FORMAT_MENIFEST)) {
    accept[format.mime] = format.accept
  }
  return {
    ...SOURCE,
    file_handlers: [{ action: './', accept }],
  }
}
