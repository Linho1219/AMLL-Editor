import saveFile from 'save-file'

import { compatibilityMap } from '@core/compat'

const fsApiAvaliable = compatibilityMap.fileSystem

interface TextFileResult {
  fileName: string
  extension: string
  content: string
}

function simpleChooseFile(
  dotExts: string[],
  description: string = '所有支持的文件',
  id?: string,
): Promise<File | null> {
  if (!fsApiAvaliable) return simpleChooseFileLegacy(dotExts.join(','))
  return new Promise(async (resolve) => {
    try {
      const opts: OpenFilePickerOptions = {
        types: [
          {
            description,
            accept: { 'application/emll-editor-private': dotExts },
          },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
        id,
      }
      const [handle] = await window.showOpenFilePicker(opts)
      if (!handle) return resolve(null)
      const file = await handle.getFile()
      resolve(file)
    } catch (e) {
      console.error(e)
      resolve(null)
    }
  })
}

function simpleChooseFileLegacy(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      document.body.removeChild(input)
      const file = input.files?.[0]
      if (!file) resolve(null)
      else resolve(file)
    })
    input.addEventListener('cancel', () => {
      document.body.removeChild(input)
      resolve(null)
    })
    input.click()
  })
}

export async function simpleChooseTextFile(
  dotExts: string[],
  description: string = '所有支持的文件',
  id?: string,
): Promise<TextFileResult | null> {
  return new Promise(async (resolve) => {
    const file = await simpleChooseFile(dotExts, description, id)
    if (!file) return null
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const extension = (file.name.split('.').pop() || '').toLowerCase()
      resolve({ fileName: file.name, extension, content })
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}

function simpleSaveFileLegacy(blob: Blob, name: string, dotExt: string) {
  saveFile(blob, `${name}${dotExt}`)
}

export async function simpleSaveFile(
  content: File | Blob,
  suggestedName: string,
  dotExts: string[],
  description: string = '所有支持的文件',
  id?: string,
): Promise<boolean> {
  const blob = content instanceof Blob ? content : new Blob([content])
  if (!fsApiAvaliable) {
    simpleSaveFileLegacy(blob, suggestedName, dotExts[0]!)
    return true
  }
  try {
    const opts: SaveFilePickerOptions = {
      suggestedName,
      types: [
        {
          description,
          accept: {
            'application/emll-editor-private': dotExts,
          },
        },
      ],
      excludeAcceptAllOption: true,
      id,
    }

    const handle = await (window as any).showSaveFilePicker(opts)
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

export async function simpleSaveTextFile(
  content: string,
  suggestedName: string,
  dotExts: string[],
  description: string = '所有支持的文件',
  id?: string,
): Promise<boolean> {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  return simpleSaveFile(blob, suggestedName, dotExts, description, id)
}
