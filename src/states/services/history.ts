import { computed, nextTick, reactive, toRaw, watch } from 'vue'
import cloneDeep from 'lodash-es/cloneDeep'
import { tryRaf } from '@utils/tryRaf'
import type { LyricLine, LyricWord, RuntimeSnapShot, Snapshot } from '@core/types'
import { useCoreStore, useRuntimeStore, useStaticStore } from '@states/stores'
const staticStore = useStaticStore()

const snapshotList = new Map<number, Snapshot>()
const state = reactive({
  head: -1,
  current: -1,
  tail: 0,
})
const redoable = computed(() => state.current < state.head)
const undoable = computed(() => state.current > state.tail)
const maxLength = 50
let stopRecording = false

let shutdownHook: (() => void) | null = null

function init() {
  state.head = state.current = -1
  state.tail = 0
  stopRecording = false
  snapshotList.clear()
  take()
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  let isTakingSnapshot = false
  const coreStoreWatcher = watch(
    [() => coreStore.lyricLines, () => coreStore.metadata],
    () => {
      if (stopRecording) return
      isTakingSnapshot = true
      nextTick(() => {
        take()
        isTakingSnapshot = false
      })
    },
    { deep: true },
  )
  const runtimeStoreWatcher = watch(
    [
      () => runtimeStore.currentView,
      () => runtimeStore.selectedLines,
      () => runtimeStore.selectedWords,
    ],
    () => {
      if (stopRecording || isTakingSnapshot) return
      const currentSnapshot = snapshotList.get(state.current)
      if (!currentSnapshot) return
      currentSnapshot.lastRuntime = takeRuntime()
    },
    { deep: true },
  )
  shutdownHook = () => {
    coreStoreWatcher()
    runtimeStoreWatcher()
  }
}

function takeRuntime(): RuntimeSnapShot {
  const runtimeStore = useRuntimeStore()
  return {
    currentView: toRaw(runtimeStore.currentView),
    selectedLineIds: [...runtimeStore.selectedLines].map((l) => l.id),
    selectedWordIds: [...runtimeStore.selectedWords].map((w) => w.id),
    lastTouchedLineId: staticStore.lastTouchedLine?.id,
    lastTouchedWordId: staticStore.lastTouchedWord?.id,
  }
}
function take() {
  const coreStore = useCoreStore()
  const snapshot: Snapshot = {
    timestamp: Date.now(),
    core: cloneDeep({
      metadata: toRaw(coreStore.metadata),
      lyricLines: toRaw(coreStore.lyricLines),
    }),
    firstRuntime: takeRuntime(),
  }
  snapshotList.set(++state.current, snapshot)
  if (state.current < state.head)
    for (let i = state.head; i > state.current; --i) snapshotList.delete(i)
  state.head = state.current
  if (snapshotList.size > maxLength) snapshotList.delete(state.tail++)
}

function wayback(snapshot: Readonly<Snapshot>, isRedo = false) {
  snapshot = cloneDeep(snapshot)
  // cloneDeep: avoid snapshot objects linking back into coreStore reactive objects.
  // If not cloned, restoring would cause snapshot to share references with the editor,
  // and any later edits would corrupt historical snapshots.

  const snapshotRuntime = isRedo
    ? snapshot.firstRuntime
    : (snapshot.lastRuntime ?? snapshot.firstRuntime)
  const snapshotCore = snapshot.core
  stopRecording = true
  const runtimeStore = useRuntimeStore()
  const coreStore = useCoreStore()
  coreStore.metadata.length = 0
  snapshotCore.metadata.forEach(({ key, values }) => coreStore.metadata.push({ key, values }))
  coreStore.lyricLines.splice(0, coreStore.lyricLines.length, ...snapshotCore.lyricLines)
  runtimeStore.currentView = snapshotRuntime.currentView
  const selectedLines: LyricLine[] = []
  const selectedWords: LyricWord[] = []
  let lastTouchedLine: LyricLine | null = null
  let lastTouchedWord: LyricWord | null = null
  let firstLineIndex: number | undefined = undefined
  for (const [index, line] of coreStore.lyricLines.entries()) {
    // Use coreStore.lyricLines instead of snapshotCore.lyricLines:
    // the former is proxified, !== the latter
    if (snapshotRuntime.selectedLineIds.includes(line.id)) {
      selectedLines.push(line)
      firstLineIndex ??= index
    }
    if (snapshotRuntime.lastTouchedLineId === line.id) lastTouchedLine = line
    for (const word of line.words) {
      if (snapshotRuntime.selectedWordIds.includes(word.id)) selectedWords.push(word)
      if (snapshotRuntime.lastTouchedWordId === word.id) lastTouchedWord = word
    }
  }
  if (selectedWords.length) runtimeStore.selectWord(...selectedWords)
  else runtimeStore.selectLine(...selectedLines)
  staticStore.lastTouchedLine = lastTouchedLine
  staticStore.lastTouchedWord = lastTouchedWord
  if (firstLineIndex !== undefined)
    tryRaf(() => {
      const hook = staticStore.editorHook
      if (hook?.view === snapshotRuntime.currentView) {
        hook.scrollTo(firstLineIndex, { align: 'nearest' })
        return true
      }
    })
  setTimeout(() => (stopRecording = false), 0)
}

function undo() {
  if (!undoable.value) return null
  const snapshot = snapshotList.get(--state.current)
  if (!snapshot) throw new Error('Snapshot not found during undo')
  wayback(snapshot)
}

function redo() {
  if (!redoable.value) return null
  const snapshot = snapshotList.get(++state.current)
  if (!snapshot) throw new Error('Snapshot not found during redo')
  wayback(snapshot, true)
}

function clear() {
  state.head = state.current = -1
  state.tail = 0
  snapshotList.clear()
  take()
}

function shutdown() {
  if (shutdownHook) {
    shutdownHook()
    shutdownHook = null
  }
}

export const editHistory = {
  init,
  take,
  undo,
  redo,
  clear,
  shutdown,
  redoable,
  undoable,
  state: state as Readonly<typeof state>,
}
