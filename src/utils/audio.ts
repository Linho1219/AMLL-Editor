import { usePreferenceStore } from '@/stores/preference'
import { computed, readonly, ref, shallowRef } from 'vue'
import { useNcmResolver } from './ncm'

// use ms as time unit
export function useAudioCtrl() {
  const audio = new Audio()
  let revokeUrlHook: (() => void) | null = null
  const activatedRef = ref(false)
  const lengthRef = ref(0)
  const audioBufferRef = shallowRef<AudioBuffer | null>(null)
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

  function mount(src: Blob | File, filename?: string): Promise<void> {
    audio.pause()
    audio.currentTime = 0
    audio.playbackRate = 1
    audio.volume = 1
    filenameRef.value = filename ?? (src instanceof File ? src.name : undefined)
    revokeUrlHook?.()
    revokeUrlHook = null
    const objUrl = URL.createObjectURL(src)
    revokeUrlHook = () => URL.revokeObjectURL(objUrl)
    audio.src = objUrl
    activatedRef.value = true
    progressRef.value = 0
    playingRef.value = false
    src.arrayBuffer().then(async (buffer) => {
      const audioCtx = new AudioContext()
      const decoded = await audioCtx.decodeAudioData(buffer)
      audioBufferRef.value = decoded
    })
    return new Promise((resolve) => {
      audio.onloadedmetadata = () => {
        lengthRef.value = Math.round(audio.duration * 1000)
        maintainMediaSession()
        audio.playbackRate = playbackRateRef.value
        audio.volume = volumeRef.value
        resolve()
      }
    })
  }
  async function mountNcm(src: Blob | File, filename?: string) {
    const ncmResolver = useNcmResolver()
    const extractedBlob = await ncmResolver.transform(src)
    await mount(extractedBlob, filename ?? (src instanceof File ? src.name : undefined))
    ncmResolver.destroy()
  }

  const seek = (time: number) => (audio.currentTime = time / 1000)
  const seekBy = (delta: number) => {
    delta /= 1000
    const target = Math.min(Math.max(0, audio.currentTime + delta), audio.duration)
    audio.currentTime = target
  }
  const getProgress = () => Math.round(audio.currentTime * 1000)
  const progressRef = ref(0)
  const maintainProgressRef = () => {
    progressRef.value = getProgress()
    if (!audio.paused) requestAnimationFrame(maintainProgressRef)
  }
  audio.onseeked = () => (progressRef.value = getProgress())
  const amendmentRef = computed(
    () => usePreferenceStore().globalLatency * playbackRateRef.value * (playingRef.value ? 1 : 0),
  )

  /**
   * Media playback in browsers is not idempotent — calling `audio.play()` or
   * `audio.pause()` repeatedly can trigger unstable behavior (especially on
   * Firefox/Linux), including aborted media fetches and rapid play/pause loops.
   * Always check the current state.
   */
  const play = () => {
    if (audio.src && audio.paused) audio.play()
  }
  const pause = () => {
    if (audio.src && !audio.paused) audio.pause()
  }
  const togglePlay = () => {
    if (!audio.src) return
    if (audio.paused) audio.play()
    else audio.pause()
  }

  const playingRef = ref(false)
  audio.onplay = () => {
    playingRef.value = true
    maintainProgressRef()
  }
  audio.onpause = () => (playingRef.value = false)

  const _volume = ref(audio.volume)
  audio.onvolumechange = () => {
    if (_volume.value !== audio.volume) {
      _volume.value = audio.volume
    }
  }
  const volumeRef = computed({
    get: () => _volume.value,
    set: (v: number) => {
      v = Math.min(Math.max(0, v), 1)
      if (v !== audio.volume) audio.volume = v
    },
  })

  const _playbackRate = ref(audio.playbackRate)
  audio.onratechange = () => {
    if (_playbackRate.value !== audio.playbackRate) {
      _playbackRate.value = audio.playbackRate
    }
  }
  const playbackRateRef = computed({
    get: () => _playbackRate.value,
    set: (v: number) => {
      if (v !== audio.playbackRate) audio.playbackRate = v
    },
  })

  const destroy = () => {
    audio.pause()
    revokeUrlHook?.()
    revokeUrlHook = null
    audio.src = ''
    activatedRef.value = false
    progressRef.value = 0
    playingRef.value = false
    audioBufferRef.value = null
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
    }
  }

  return {
    audioEl: audio,
    mount,
    mountNcm,
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    getProgress,
    /** Readonly: use `seek` to change */
    progressComputed: readonly(progressRef),
    lengthComputed: readonly(lengthRef),
    amendmentRef,
    /** Readonly: use `play`, `pause`, `togglePlay` to change */
    playingComputed: readonly(playingRef),
    volumeRef,
    playbackRateRef,
    activatedRef,
    audioBufferComputed: readonly(audioBufferRef),
    filenameComputed: readonly(filenameRef),
    destroy,
  }
}

export type AudioCtrl = ReturnType<typeof useAudioCtrl>
