<template>
  <div class="preview">
    <LyricPlayer
      class="amll-lyric-player"
      :lyric-lines="amllLyricLines"
      :current-time="amendedProgressComputed"
      :playing="playingComputed"
      :enable-blur="false"
      :enable-spring="false"
      :word-fade-width="0.25"
      @line-click="jumpSeek"
      :key="playerKey"
    />
    <Button
      class="preview-reload-button"
      label="重载 AMLL"
      severity="secondary"
      icon="pi pi-refresh"
      variant="text"
      @click="playerKey = Symbol()"
    />
  </div>
</template>
<script setup lang="ts">
import { LyricPlayer } from '@applemusic-like-lyrics/vue'
import '@applemusic-like-lyrics/core/style.css'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Button } from 'primevue'
import { useCoreStore, useRuntimeStore, useStaticStore } from '@states/stores'
import { tryRaf } from '@utils/tryRaf'
const coreStore = useCoreStore()
const {
  audio: { progressComputed, playingComputed, amendedProgressComputed, seek },
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
const staticStore = useStaticStore()
onMounted(() => runtimeStore.clearSelection())
onUnmounted(() => {
  if (coreStore.lyricLines.length === 0) return
  for (const [index, line] of coreStore.lyricLines.entries()) {
    if (line.endTime > progressComputed.value) {
      runtimeStore.selectLine(line)
      tryRaf(() => {
        if (!staticStore.editorHook) return
        else staticStore.editorHook.scrollTo(index, { align: 'center' })
        return true
      })
      return
    }
  }
  runtimeStore.selectLine(coreStore.lyricLines.at(-1)!)
  tryRaf(() => {
    if (!staticStore.editorHook) return
    else staticStore.editorHook.scrollTo(coreStore.lyricLines.length - 1, { align: 'end' })
    return true
  })
})
</script>

<style lang="scss">
.preview {
  font-weight: 500;
  padding: 0 1rem;
  position: relative;
  flex: 1;
  .preview-reload-button {
    position: absolute;
    bottom: 0.5rem;
    right: 1rem;
    z-index: 10;
  }
}
.amll-lyric-player.dom {
  line-height: 1.5;
  --bright-mask-alpha: 1;
  --dark-mask-alpha: 0.4;
  --amll-lp-color: light-dark(var(--p-neutral-800), var(--p-neutral-100));
  --amll-lp-hover-bg-color: color-mix(in srgb, var(--amll-lp-color), transparent 95%);

  // Fix padding issue: letters like 'j' get cut off
  span[class^='_emphasizeWrapper'] span {
    padding: 1em;
    margin: -1em;
  }
}
</style>
