import { computed, readonly, ref, shallowRef } from 'vue'
import { usePrefStore } from '@states/stores'
import { useNcmResolver } from './ncm'

export function useAudioCtrl() {
  const audioEl = new Audio()
  let revokeUrlHook: (() => void) | null = null
  const activatedRef = ref(false)
  const lengthRef = ref(0)
  const audioBufferRef = shallowRef<AudioBuffer | null>(null)
  const rawFileRef = shallowRef<File | null>(null)
  const filenameRef = ref<string | undefined>(undefined)

  function maintainMediaSession() {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: filenameRef.value ?? 'Unknown',
      artist: 'AMLL Editor',
      album: '',
      artwork: [],
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      seek(0)
    })
  }

  //#region File
  function mount(src: File): Promise<void> {
    rawFileRef.value = src
    if (src.name.endsWith('.ncm')) return _mountNcm(src)
    return _mount(src)
  }

  async function _mountNcm(src: File) {
    rawFileRef.value = src
    const ncmResolver = useNcmResolver()
    const extractedBlob = await ncmResolver.transform(src)
    await _mount(extractedBlob, src.name)
    ncmResolver.destroy()
  }

  function _mount(src: Blob, filename: string): Promise<void>
  function _mount(src: File): Promise<void>
  function _mount(src: Blob | File, filename?: string): Promise<void> {
    audioEl.pause()
    audioEl.currentTime = 0
    audioEl.playbackRate = 1
    audioEl.volume = 1
    filenameRef.value = filename ?? (src instanceof File ? src.name : undefined)
    revokeUrlHook?.()
    revokeUrlHook = null
    const objUrl = URL.createObjectURL(src)
    revokeUrlHook = () => URL.revokeObjectURL(objUrl)
    audioEl.src = objUrl
    activatedRef.value = true
    progressRef.value = 0
    playingRef.value = false
    src.arrayBuffer().then(async (buffer) => {
      const audioCtx = new AudioContext()
      const decoded = await audioCtx.decodeAudioData(buffer)
      audioBufferRef.value = decoded
    })
    return new Promise((resolve) => {
      audioEl.onloadedmetadata = () => {
        lengthRef.value = Math.round(audioEl.duration * 1000)
        maintainMediaSession()
        audioEl.playbackRate = playbackRateRef.value
        audioEl.volume = volumeRef.value
        resolve()
      }
    })
  }
  //#endregion

  //#region Playback
  const seek = (time: number) => (audioEl.currentTime = time / 1000)
  const seekBy = (delta: number) => {
    delta /= 1000
    const target = Math.min(Math.max(0, audioEl.currentTime + delta), audioEl.duration)
    audioEl.currentTime = target
  }
  const getProgress = () => Math.round(audioEl.currentTime * 1000)
  const getPreciseProgress = () => audioEl.currentTime * 1000
  const progressRef = ref(0)
  const maintainProgressRef = () => {
    progressRef.value = getProgress()
    if (!audioEl.paused) requestAnimationFrame(maintainProgressRef)
  }
  audioEl.onseeked = () => (progressRef.value = getProgress())
  const amendmentComputed = computed(() =>
    !playingRef.value ? 0 : usePrefStore().globalLatency * playbackRateRef.value,
  )
  const amendedProgressComputed = computed(() =>
    Math.min(Math.max(0, progressRef.value - amendmentComputed.value), lengthRef.value),
  )

  /**
   * Media playback in browsers is not idempotent — calling `audio.play()` or
   * `audio.pause()` repeatedly can trigger unstable behavior (especially on
   * Firefox/Linux), including aborted media fetches and rapid play/pause loops.
   * Always check the current state.
   */
  const play = () => {
    if (audioEl.src && audioEl.paused) audioEl.play()
  }
  const pause = () => {
    if (audioEl.src && !audioEl.paused) audioEl.pause()
  }
  const togglePlay = () => {
    if (!audioEl.src) return
    if (audioEl.paused) audioEl.play()
    else audioEl.pause()
  }

  const playingRef = ref(false)
  audioEl.onplay = () => {
    playingRef.value = true
    maintainProgressRef()
  }
  audioEl.onpause = () => (playingRef.value = false)

  const _volume = ref(audioEl.volume)
  audioEl.onvolumechange = () => {
    _volume.value = audioEl.volume
  }
  const volumeRef = computed({
    get: () => _volume.value,
    set: (v: number) => {
      v = Math.min(Math.max(0, v), 1)
      if (v !== audioEl.volume) audioEl.volume = v
    },
  })

  const _playbackRate = ref(audioEl.playbackRate)
  audioEl.onratechange = () => {
    _playbackRate.value = audioEl.playbackRate
  }
  const playbackRateRef = computed({
    get: () => _playbackRate.value,
    set: (v: number) => {
      if (v !== audioEl.playbackRate) audioEl.playbackRate = v
    },
  })
  //#endregion

  const destroy = () => {
    audioEl.pause()
    revokeUrlHook?.()
    revokeUrlHook = null
    audioEl.src = ''
    activatedRef.value = false
    progressRef.value = 0
    playingRef.value = false
    audioBufferRef.value = null
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
    }
  }

  return {
    audioEl: audioEl,
    mount,
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    getProgress,
    getPreciseProgress,
    /** Readonly: use `seek` to change */
    progressComputed: readonly(progressRef),
    lengthComputed: readonly(lengthRef),
    amendmentComputed,
    amendedProgressComputed,
    /** Readonly: use `play`, `pause`, `togglePlay` to change */
    playingComputed: readonly(playingRef),
    volumeRef,
    playbackRateRef,
    activatedRef,
    audioBufferComputed: readonly(audioBufferRef),
    filenameComputed: readonly(filenameRef),
    rawFileComputed: readonly(rawFileRef),
    destroy,
  }
}

export type AudioCtrl = ReturnType<typeof useAudioCtrl>
