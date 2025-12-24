import { detectFormat, portFormatRegister } from '@core/convert'
import { parseTTML, stringifyTTML, ttmlReg } from '@core/convert/formats/ttml'
import { readonly, ref } from 'vue'
import { collectProjectData, makeProjectFile, mountProjectData, parseProjectFile } from './project'
import { collectPersist, applyPersist } from '@states/services/port'
import { breakExtension } from '@utils/breakExtension'
import type { ValueOf } from '@utils/types'
import { editHistory } from '@states/services/history'
import type { Persist } from '@core/types'

export { simpleChooseFile, simpleSaveFile } from './simple'
export { simpleChooseTextFile, simpleSaveTextFile } from './simple'

// Native format (*.alp) and TTML format (*.ttml) are the first-class supported formats
// When save, they are written directly by default

// Other formats are supported via import/export services
// Won't be saved directly

const BackingFmt = {
  TTML: 'TTML',
  ALP: 'ALP',
} as const
type BackingFmt = ValueOf<typeof BackingFmt>

const allSupportedExt = new Set([
  '.alp',
  '.ttml',
  ...portFormatRegister.map((f) => f.accept).flat(),
]) as Set<`.${string}`>
const allSupportedExtArr = [...allSupportedExt]
const alpPickerType: FilePickerAcceptType[] = [
  {
    description: 'AMLL Editor 工程',
    accept: { 'application/alp': ['.alp'] },
  },
]
const ttmlPickerType: FilePickerAcceptType[] = [
  {
    description: ttmlReg.name,
    accept: { 'application/ttml+xml': ['.ttml'] },
  },
]
const allPickerTypes: FilePickerAcceptType[] = [
  {
    description: '所有支持的格式',
    accept: { 'application/alp': allSupportedExtArr },
  },
  ...alpPickerType,
  ...ttmlPickerType,
  ...portFormatRegister.map((format) => ({
    description: format.name,
    accept: { [`text/${format.accept[0]}`]: format.accept },
  })),
]

let fileSystemHandle: FileSystemFileHandle | null = null
let currBackingFmt: BackingFmt = BackingFmt.ALP
const createdAtRef = ref<Date | null>(null)
const readonlyRef = ref<boolean>(true)
const displayFilenameRef = ref<string>('未命名.alp')

interface FileState {
  fileSystemHandle: FileSystemFileHandle | null
  currBackingFmt: BackingFmt
  createdAt: Date | null
  displayFilename: string
  isReadonly: boolean
}
function setFileState(state: Partial<FileState> | null) {
  if (!state) state = {}
  fileSystemHandle = state.fileSystemHandle ?? null
  currBackingFmt = state.currBackingFmt ?? BackingFmt.ALP
  createdAtRef.value = state.createdAt ?? null
  displayFilenameRef.value = state.displayFilename ?? '未命名.alp'
  readonlyRef.value = state.isReadonly ?? true
}

/**
 * Handle opening of any known file format.
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openFile() {
  const [handle] = await showOpenFilePicker({
    types: allPickerTypes,
    excludeAcceptAllOption: true,
    id: 'amll-ttml-tool-file-open',
  })
  const [, ext] = breakExtension(handle.name)
  if (!allSupportedExt.has(`.${ext}`)) throw new Error('Unsupported file format.')
  if (ext === 'alp') await handleProjFile(handle)
  else if (ext === 'ttml') await handleTTMLFile(handle)
  else await handleMiscFile(handle)
  return handle.name
}
/**
 * Handle opening of project file (*.alp).
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openProjFile() {
  const [handle] = await showOpenFilePicker({
    types: alpPickerType,
    excludeAcceptAllOption: true,
    id: 'amll-ttml-tool-file-open',
  })
  await handleProjFile(handle)
  return handle.name
}
/**
 * Handle opening of TTML file (*.ttml).
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openTTMLFile() {
  const [handle] = await showOpenFilePicker({
    types: ttmlPickerType,
    excludeAcceptAllOption: true,
    id: 'amll-ttml-tool-file-open',
  })
  await handleTTMLFile(handle)
  return handle.name
}

const tryWritehandle = (handle: FileSystemFileHandle) =>
  handle
    .createWritable()
    .then(() => (readonlyRef.value = false))
    .catch(() => (readonlyRef.value = true))

async function handleProjFile(handle: FileSystemFileHandle) {
  const file = await handle.getFile()
  const payload = await parseProjectFile(file)
  mountProjectData(payload)
  setFileState({
    fileSystemHandle: handle,
    currBackingFmt: BackingFmt.ALP,
    createdAt: payload.createdAt ?? new Date(file.lastModified),
    displayFilename: file.name,
  })
  editHistory.markSaved()
  tryWritehandle(handle)
}
async function handleTTMLFile(handle: FileSystemFileHandle) {
  const file = await handle.getFile()
  const text = await file.text()
  const data = parseTTML(text)
  applyPersist(data)
  setFileState({
    fileSystemHandle: handle,
    currBackingFmt: BackingFmt.ALP,
    createdAt: new Date(file.lastModified),
    displayFilename: file.name,
  })
  editHistory.markSaved()
  tryWritehandle(handle)
}
async function handleMiscFile(handle: FileSystemFileHandle) {
  const file = await handle.getFile()
  const [name, ext] = breakExtension(file.name)
  const text = await file.text()
  const format = detectFormat(ext, text)
  const data = format.parser(text)
  applyPersist(data)
  setFileState({
    currBackingFmt: BackingFmt.ALP,
    createdAt: new Date(),
    displayFilename: `${name}.alp`,
  })
}
function importPersist(data: Persist, name: string = '未命名') {
  applyPersist(data)
  setFileState({
    currBackingFmt: BackingFmt.ALP,
    createdAt: new Date(),
    displayFilename: `${name}.alp`,
  })
}
function createBlankProject() {
  importPersist({ lyricLines: [], metadata: {} })
  editHistory.markSaved()
}

/**
 * Save to backing format file
 * @throws user cancel; write errors.
 * @returns Filename
 */
async function saveFile() {
  if (!fileSystemHandle) {
    console.log('No file handle, invoking Save As...')
    await saveAsFile()
    return
  }
  const writeable = await fileSystemHandle.createWritable()
  readonlyRef.value = false
  let blob: Blob
  if (currBackingFmt === BackingFmt.ALP) {
    const collected = collectProjectData()
    blob = await makeProjectFile(collected)
  } else if (currBackingFmt === BackingFmt.TTML) {
    const persist = collectPersist()
    const str = stringifyTTML(persist)
    blob = new Blob([str], { type: 'application/xml' })
  } else throw new Error('Unsupported backing format.')
  await writeable.write(blob)
  await writeable.close()
  editHistory.markSaved()
  return fileSystemHandle.name
}
/**
 * Save as a new file
 * Only for backing formats (*.alp, *.ttml)
 * For other formats, use export service instead.
 * @throws User cancel; write errors.
 * @returns Filename
 */
async function saveAsFile() {
  const types: FilePickerAcceptType[] = [...alpPickerType, ...ttmlPickerType]
  const handle = await showSaveFilePicker({
    types,
    excludeAcceptAllOption: true,
    id: 'amll-ttml-tool-file-save-as',
    suggestedName: displayFilenameRef.value,
  })
  const writeable = await handle.createWritable()
  readonlyRef.value = false
  let blob: Blob
  const [, ext] = breakExtension(handle.name)
  if (ext === 'alp') {
    const collected = collectProjectData()
    blob = await makeProjectFile(collected)
    currBackingFmt = BackingFmt.ALP
  } else if (ext === 'ttml') {
    const persist = collectPersist()
    const str = stringifyTTML(persist)
    blob = new Blob([str], { type: 'application/xml' })
    currBackingFmt = BackingFmt.TTML
  } else throw new Error('Unsupported backing format.')
  await writeable.write(blob)
  await writeable.close()
  fileSystemHandle = handle
  displayFilenameRef.value = handle.name
  editHistory.markSaved()
  return handle.name
}

export const fileState = {
  openFile,
  openProjFile,
  openTTMLFile,
  saveFile,
  saveAsFile,
  importPersist,
  createBlankProject,
  createdAtComputed: readonly(createdAtRef),
  displayFilenameComputed: readonly(displayFilenameRef),
}
