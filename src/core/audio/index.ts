import { computed, readonly, ref } from 'vue'
import { usePrefStore } from '@states/stores'
import { useNcmResolver } from './ncm'

// Use ms as time unit
export function useAudioCtrl() {
  const audioEl = new Audio()
  let revokeUrlHook: (() => void) | null = null
  const activatedRef = ref(false)
  const lengthRef = ref(0)

  function mount(src: Blob | File | string): Promise<void> {
    audioEl.pause()
    audioEl.currentTime = 0
    audioEl.playbackRate = 1
    audioEl.volume = 1
    revokeUrlHook?.()
    revokeUrlHook = null
    if (typeof src !== 'string') {
      const url = URL.createObjectURL(src)
      revokeUrlHook = () => URL.revokeObjectURL(url)
      src = url
    }
    audioEl.src = src
    activatedRef.value = true
    progressRef.value = 0
    playingRef.value = false
    return new Promise((resolve) => {
      audioEl.onloadedmetadata = () => {
        lengthRef.value = audioEl.duration * 1000
        resolve()
        audioEl.playbackRate = playbackRateRef.value
        audioEl.volume = volumeRef.value
      }
    })
  }
  async function mountNcm(src: Blob | File) {
    const ncmResolver = useNcmResolver()
    const extractedBlob = await ncmResolver.transform(src)
    await mount(extractedBlob)
    ncmResolver.destroy()
  }

  const seek = (time: number) => (audioEl.currentTime = time / 1000)
  const seekBy = (delta: number) => {
    delta /= 1000
    const target = Math.min(Math.max(0, audioEl.currentTime + delta), audioEl.duration)
    audioEl.currentTime = target
  }
  const getProgress = () => Math.round(audioEl.currentTime * 1000)
  const progressRef = ref(0)
  const maintainProgressRef = () => {
    progressRef.value = getProgress()
    if (!audioEl.paused) requestAnimationFrame(maintainProgressRef)
  }
  audioEl.onseeked = () => (progressRef.value = getProgress())
  const amendmentRef = computed(
    () => usePrefStore().globalLatency * playbackRateRef.value * (playingRef.value ? 1 : 0),
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

  return {
    audioEl: audioEl,
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
  }
}

export type AudioCtrl = ReturnType<typeof useAudioCtrl>
