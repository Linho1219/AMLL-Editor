import { t } from '@i18n'
import { readonly, ref } from 'vue'

import { audioEngine } from '@core/audio'
import { compatibilityMap } from '@core/compat'
import { type Convert as CV, detectFormat, portFormatRegister } from '@core/convert'
import { parseTTML, stringifyTTML } from '@core/convert/formats/ttml'
import FORMAT_MANIFEST from '@core/convert/manifest.json'
import type { Persist } from '@core/types'

import { editHistory } from '@states/services/history'
import { applyPersist, collectPersist } from '@states/services/port'
import { useCoreStore, usePrefStore } from '@states/stores'

import type { TimeoutHandle, ValueOf } from '@utils/types'

import { fileSystemBackend } from './backends/filesystem'
import { h5NativeBackend } from './backends/h5native'
import { collectProjectData, makeProjectFile, mountProjectData, parseProjectFile } from './project'
import { breakExtension, checkDataDropConfirm } from './shared'
import {
  type FileBackend,
  type FileBackendPickerAccept,
  type FileHandle,
  type FileReadResult,
} from './types'

export { simpleChooseTextFile, simpleSaveTextFile } from './simple'

export const fileBackend: FileBackend = compatibilityMap.fileSystem
  ? fileSystemBackend
  : h5NativeBackend

// Native format (*.alp) and TTML format (*.ttml) are the first-class supported formats
// When save, they are written directly by default

// Other formats are supported via import/export services
// Won't be saved directly

const tt = t.file

const BackingFmt = {
  TTML: 'TTML',
  ALP: 'ALP',
} as const
type BackingFmt = ValueOf<typeof BackingFmt>

const allSupportedExt = new Set([
  '.alp',
  '.ttml',
  ...portFormatRegister.map((f) => f.accept).flat(),
]) as Set<string>

const manifest2formats = (
  key: CV.AllFormatKey,
  mItem: CV.FormatManifest,
): FileBackendPickerAccept => ({
  description: t.formats[key].name(),
  accept: { [mItem.mime]: mItem.accept },
})
const allSupportedExtArr = [...allSupportedExt]
const alpPickerType: FileBackendPickerAccept[] = [manifest2formats('alp', FORMAT_MANIFEST.alp)]
const ttmlPickerType: FileBackendPickerAccept[] = [manifest2formats('ttml', FORMAT_MANIFEST.ttml)]
const allPickerTypes: FileBackendPickerAccept[] = [
  {
    description: tt.allSupportedFormats(),
    accept: { 'application/x-amll-editor-allsupported': allSupportedExtArr },
  },
  ...alpPickerType,
  ...ttmlPickerType,
  ...portFormatRegister.map(({ key, accept, mime }) => manifest2formats(key, { accept, mime })),
]

let currHandle: FileHandle | null = null
let currBackingFmt: BackingFmt = BackingFmt.ALP
const createdAtRef = ref<Date | null>(null)
const readonlyRef = ref<boolean>(true)
const displayFilenameRef = ref<string>('')
const savedAtRef = ref<Date | null>(null)

interface FileState {
  handle: FileHandle | null
  currBackingFmt: BackingFmt
  createdAt: Date | null
  displayFilename: string
  isReadonly: boolean
  savedAt: Date | null
}
function setFileState(state: Partial<FileState> | null) {
  if (!state) state = {}
  currHandle = state.handle ?? null
  currBackingFmt = state.currBackingFmt ?? currBackingFmt
  createdAtRef.value = state.createdAt ?? null
  displayFilenameRef.value = state.displayFilename ?? tt.untitled()
  readonlyRef.value = state.isReadonly ?? true
  savedAtRef.value = state.savedAt ?? null
}

function useDefaultFormat(basename: string) {
  const prefStore = usePrefStore()
  const ext = prefStore.ttmlAsDefault ? 'ttml' : 'alp'
  return {
    displayFilename: `${basename}.${ext}`,
    currBackingFmt: prefStore.ttmlAsDefault ? BackingFmt.TTML : BackingFmt.ALP,
  }
}

const throwUserAbort = () => {
  throw new Error('The user aborted a request.')
}

/**
 * Handle opening of any known file format.
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openFile() {
  if (!(await checkDataDropConfirm())) throwUserAbort()
  const result = await fileBackend.read('amll-ttml-tool-file-open', allPickerTypes)
  await handleFile(result)
  return result.filename
}
/**
 * Handle opening of project file (*.alp).
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openProjFile() {
  if (!(await checkDataDropConfirm())) throwUserAbort()
  const result = await fileBackend.read('amll-ttml-tool-file-open', alpPickerType)
  await handleProjFile(result)
  return result.filename
}
/**
 * Handle opening of TTML file (*.ttml).
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openTTMLFile() {
  if (!(await checkDataDropConfirm())) throwUserAbort()
  const result = await fileBackend.read('amll-ttml-tool-file-open', ttmlPickerType)
  await handleTTMLFile(result)
  return result.filename
}

const askForWrite = async (handle: FileHandle) => {
  const hasPermission = await fileBackend.askForWritePermission(handle)
  readonlyRef.value = !hasPermission
}
async function handleFile(result: FileReadResult) {
  const [, ext] = breakExtension(result.filename)
  if (!allSupportedExt.has(`.${ext}`)) throw new Error(tt.failedToReadErr.typeNotSupported(ext))
  if (ext === 'alp') await handleProjFile(result)
  else if (ext === 'ttml') await handleTTMLFile(result)
  else await handleMiscFile(result)
}
async function handleProjFile(result: FileReadResult) {
  const { handle, blob, filename } = result
  const payload = await parseProjectFile(blob)
  mountProjectData(payload)
  setFileState({
    handle,
    currBackingFmt: BackingFmt.ALP,
    createdAt: payload.createdAt,
    displayFilename: filename,
  })
  editHistory.markSaved()
  askForWrite(handle).then(scheduleAutoSave)
}
async function handleTTMLFile(result: FileReadResult) {
  const { handle, blob, filename } = result
  const text = await blob.text()
  const data = parseTTML(text)
  applyPersist(data)
  setFileState({
    handle,
    currBackingFmt: BackingFmt.TTML,
    createdAt: new Date(),
    displayFilename: filename,
  })
  editHistory.markSaved()
  askForWrite(handle).then(scheduleAutoSave)
}
async function handleMiscFile(result: FileReadResult) {
  const { blob, filename } = result
  const [name, ext] = breakExtension(filename)
  const text = await blob.text()
  const format = detectFormat(ext, text)
  const data = format.parser(text)
  applyPersist(data)
  setFileState({
    createdAt: new Date(),
    ...useDefaultFormat(name),
  })
}
async function importPersist(data: Persist, name: string = tt.untitled()) {
  if (!(await checkDataDropConfirm())) throwUserAbort()
  applyPersist(data)
  setFileState({
    createdAt: new Date(),
    ...useDefaultFormat(name),
  })
}
async function createBlankProject() {
  await importPersist({ lines: [], metadata: {} })
  editHistory.markSaved()
}

const blobGenerators: Record<BackingFmt, () => Promise<Blob>> = {
  ALP: async () => makeProjectFile(collectProjectData()),
  TTML: async () => new Blob([stringifyTTML(collectPersist())], { type: 'application/xml' }),
}

/**
 * Save to backing format file
 * @throws user cancel; write errors.
 * @returns Filename
 */
async function saveFile() {
  if (!currHandle) {
    console.log('No file handle, invoking Save As...')
    return await saveAsFile()
  }
  const blob = await blobGenerators[currBackingFmt]()
  const filename = await fileBackend.write(currHandle, blob)
  editHistory.markSaved()
  savedAtRef.value = new Date()
  readonlyRef.value = false
  scheduleAutoSave()
  return filename
}

function suggestName() {
  const [displayName] = breakExtension(displayFilenameRef.value)
  if (!displayName.startsWith(tt.untitled())) return displayName
  const coreStore = useCoreStore()
  const title = (coreStore.metadata.musicName ?? coreStore.metadata.ti)?.[0]
  if (title) return title
  const mediaFilename = audioEngine.filenameComputed.value
  if (mediaFilename) {
    const [name] = breakExtension(mediaFilename)
    return name
  }
  return displayName
}

/**
 * Save as a new file
 * Only for backing formats (*.alp, *.ttml)
 * For other formats, use export service instead.
 * @throws User cancel; write errors.
 * @returns Filename
 */
async function __saveAsFile(types: FileBackendPickerAccept[]) {
  const { handle, filename } = await fileBackend.writeAs(
    'amll-ttml-tool-file-save-as',
    types,
    suggestName(),
    (filename: string) => {
      const [, ext] = breakExtension(filename)
      if (ext !== 'alp' && ext !== 'ttml') throw new Error('Cannot save as non-backing format.')
      currBackingFmt = ext === 'ttml' ? BackingFmt.TTML : BackingFmt.ALP
      return blobGenerators[currBackingFmt]()
    },
  )
  setFileState({
    handle,
    currBackingFmt,
    displayFilename: filename,
    isReadonly: false,
    savedAt: new Date(),
  })
  editHistory.markSaved()
  scheduleAutoSave()
  return filename
}
async function saveAsFile() {
  const prefStore = usePrefStore()
  const types = prefStore.ttmlAsDefault
    ? [...ttmlPickerType, ...alpPickerType]
    : [...alpPickerType, ...ttmlPickerType]
  return await __saveAsFile(types)
}
async function saveAsTTMLFile() {
  return await __saveAsFile(ttmlPickerType)
}
async function saveAsProjectFile() {
  return await __saveAsFile(alpPickerType)
}

let autoSaveTimer: TimeoutHandle | undefined = undefined
function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = undefined
  }
  const prefStore = usePrefStore()
  if (!prefStore.autoSaveEnabled || prefStore.autoSaveIntervalMinutes < 1) return
  function doAutoSave() {
    if (!editHistory.isDirty || readonlyRef.value) return scheduleAutoSave()
    saveFile()
  }
  autoSaveTimer = setTimeout(doAutoSave, prefStore.autoSaveIntervalMinutes * 60 * 1000)
}

type Notifier = (
  summary: string,
  detail: string,
  severity?: 'info' | 'warn' | 'error' | 'success',
) => void

export const possibleAudioExts = [
  'mp3',
  'wav',
  'flac',
  'ncm',
  'opus',
  'webm',
  'weba',
  'ogg',
  'm4a',
  'oga',
  'mid',
  'aiff',
  'wma',
  'au',
]
let dragListenerInitialized = false
function initDragListener(notifier: Notifier) {
  if (dragListenerInitialized) return
  dragListenerInitialized = true
  const hasFiles = (e: DragEvent): boolean => e.dataTransfer?.types.includes('Files') ?? false

  document.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
  })
  document.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return
    const file = e.dataTransfer?.files[0]
    if (!file) return
    const el = e.target as HTMLElement
    if (el.closest('.cm-editor')) return // Skip if dropping on editor
    e.preventDefault()
    const [, ext] = breakExtension(file.name)
    if (possibleAudioExts.includes(ext)) {
      audioEngine.mount(file)
      return
    }
    if (!allSupportedExt.has(`.${ext}`))
      return notifier(
        tt.failedToReadErr.summary(),
        tt.failedToReadErr.typeNotSupported(ext),
        'error',
      )

    fileBackend.adapters
      .dragDrop(e)
      .then(async (result) => {
        if (!result) return
        await handleFile(result)
        notifier(tt.loaded(), file.name, 'success')
      })
      .catch((err) => {
        notifier(tt.failedToReadErr.summary(), String(err), 'error')
      })
  })
}

function init(notifier: Notifier) {
  setFileState({
    createdAt: new Date(),
    ...useDefaultFormat(tt.untitled()),
  })
  initDragListener(notifier)
  fileBackend.onLaunchFile?.(async (result) => {
    if (!(await checkDataDropConfirm())) return
    try {
      await handleFile(result)
      notifier(tt.loaded(), result.filename, 'success')
    } catch (err) {
      notifier(tt.failedToReadErr.summary(), String(err), 'error')
    }
  })
}

export const fileState = {
  openFile,
  openProjFile,
  openTTMLFile,
  saveFile,
  saveAsFile,
  saveAsTTMLFile,
  saveAsProjectFile,
  importPersist,
  createBlankProject,
  suggestName,
  init,
  createdAtComputed: readonly(createdAtRef),
  displayFilenameComputed: readonly(displayFilenameRef),
  readonlyComputed: readonly(readonlyRef),
  savedAtComputed: readonly(savedAtRef),
}
