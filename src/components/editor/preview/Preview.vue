<template>
  <div class="preview">
    <LyricPlayer
      class="amll-lyric-player"
      :lyric-lines="amllLyricLines"
      :current-time="progressComputed"
      :playing="playingComputed"
      :enable-blur="false"
      :enable-spring="false"
      @line-click="jumpSeek"
      :key="playerKey"
    />
  </div>
</template>
<script setup lang="ts">
import { useCoreStore } from '@/stores/core'
import { useStaticStore } from '@/stores/static'
import { LyricPlayer } from '@applemusic-like-lyrics/vue'
import '@applemusic-like-lyrics/core/style.css'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
const coreStore = useCoreStore()
const {
  audio: { progressComputed, playingComputed, seek },
} = useStaticStore()
interface AMLLLyricLine {
  words: AMLLLyricWord[]
  translatedLyric: string
  romanLyric: string
  isBG: boolean
  isDuet: boolean
  startTime: number
  endTime: number
}
export interface AMLLLyricWord {
  startTime: number
  endTime: number
  word: string
  romanWord: string
  obscene: boolean
}
const playerKey = ref(Symbol())
const amllLyricLines = computed<AMLLLyricLine[]>(() => {
  playerKey.value = Symbol() // AMLL cannot handle dynamic updates, so force re-mount
  return coreStore.lyricLines.map((line) => ({
    words: line.words.map((word) => ({
      startTime: word.startTime,
      endTime: word.endTime,
      word: word.text,
      romanWord: '',
      obscene: false,
    })),
    translatedLyric: line.translation,
    romanLyric: line.romanization,
    isBG: line.background,
    isDuet: line.duet,
    startTime: line.startTime,
    endTime: line.endTime,
  }))
})

const jumpSeek = (line: any) => {
  if (!line?.line?.lyricLine?.startTime) return
  const time = line.line.lyricLine.startTime
  seek(time)
}

const runtimeStore = useRuntimeStore()
onMounted(() => runtimeStore.clearSelection())
onUnmounted(() => {
  if (coreStore.lyricLines.length === 0) return
  for (const line of [...coreStore.lyricLines].reverse()) {
    if (line.startTime < progressComputed.value) {
      runtimeStore.selectLine(line)
      return
    }
  }
  runtimeStore.selectLine(coreStore.lyricLines[0]!)
})
</script>

<style lang="scss">
.preview {
  font-weight: 500;
  padding: 0 1rem;
  .amll-lyric-player.dom {
    line-height: 1.5;
    --bright-mask-alpha: 1;
    --dark-mask-alpha: 0.4;
    --amll-lp-color: light-dark(var(--p-neutral-800), var(--p-neutral-100));
    --amll-lp-hover-bg-color: color-mix(in srgb, var(--amll-lp-color), transparent 95%);
  }
}
</style>
