import saveFile from 'save-file'

import { defineFileBackend } from '../types'

interface H5NativeFileHandle {
  filename: string
}

const extractMIMEs = (types: FilePickerAcceptType[]): string[] =>
  types.flatMap(({ accept }) =>
    !accept ? [] : [...Object.entries(accept)].map(([mime, dotExts]) => [mime, ...dotExts]).flat(),
  )
const extractDotExts = (types: FilePickerAcceptType[]): string[] =>
  extractMIMEs(types).filter((s) => s.startsWith('.'))

export const h5NativeBackend = defineFileBackend<H5NativeFileHandle>({
  async read(_id, types) {
    const dotExts = extractMIMEs(types)
    const accept = dotExts.join(',')
    const file = await new Promise<File>((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      input.style.display = 'none'
      document.body.appendChild(input)
      input.addEventListener('change', () => {
        document.body.removeChild(input)
        const file = input.files?.[0]
        if (!file) reject('The user aborted a request.')
        else resolve(file)
      })
      input.addEventListener('cancel', () => {
        document.body.removeChild(input)
        reject('The user aborted a request.')
      })
      input.click()
    })
    return {
      handle: { filename: file.name },
      filename: file.name,
      blob: file,
    }
  },
  async askForWritePermission(_handle) {
    return false
  },
  async write(handle, blob) {
    const { filename } = handle
    saveFile(blob, filename)
    return filename
  },
  async writeAs(_id, types, suggestedBaseName, blobGenerator) {
    const [dotExt] = extractDotExts(types)
    if (!dotExt) throw new Error('Cannot determine file extension for saving.')
    const filename = `${suggestedBaseName}${dotExt}`
    console.log('h5native writeAs', filename)
    const blob = await blobGenerator(filename)
    saveFile(blob, filename)
    return {
      handle: { filename },
      filename,
      blob,
    }
  },
  adapters: {
    async dragDrop(e: DragEvent) {
      const file = e.dataTransfer?.files[0]
      if (!file) return null
      return {
        handle: { filename: file.name },
        filename: file.name,
        blob: file,
      }
    },
  },
})
