import { t } from '@i18n'

import { fileBackend } from '.'

const tt = t.file

async function simpleChooseFile(
  dotExts: string[],
  description: string = tt.allSupportedFormats(),
  id?: string,
): Promise<Blob | null> {
  const result = await fileBackend.read(id ?? 'simpleChooseFile', [
    { description, accept: { 'application/emll-editor-private': dotExts } },
  ])
  return result?.blob ?? null
}

export async function simpleChooseTextFile(
  dotExts: string[],
  description: string = tt.allSupportedFormats(),
  id?: string,
): Promise<string | null> {
  return new Promise(async (resolve) => {
    const file = await simpleChooseFile(dotExts, description, id)
    if (!file) return null
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      resolve(content)
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}

async function simpleSaveFile(
  content: File | Blob,
  suggestedName: string,
  dotExts: string[],
  description: string = tt.allSupportedFormats(),
  id?: string,
): Promise<boolean> {
  const blob = content instanceof Blob ? content : new Blob([content])
  fileBackend.writeAs(
    id ?? 'simpleSaveFile',
    [{ description, accept: { 'application/emll-editor-private': dotExts } }],
    suggestedName,
    async () => blob,
  )
  return true
}

export async function simpleSaveTextFile(
  content: string,
  suggestedName: string,
  dotExts: string[],
  description: string = tt.allSupportedFormats(),
  id?: string,
): Promise<boolean> {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  return simpleSaveFile(blob, suggestedName, dotExts, description, id)
}
