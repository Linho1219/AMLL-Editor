<template>
  <div class="__font-loader" aria-hidden="true">
    <div v-for="fontFamily in fontFamilies" :key="fontFamily" :style="{ fontFamily }">
      <span v-for="weight in weights" :key="weight" :style="{ fontWeight: weight }"> 文A </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const fontFamilies = ['var(--font-main)', 'var(--font-monospace)']
</script>

<style lang="scss">
.__font-loader {
  z-index: -1;
  position: absolute;
  clip-path: rect(0 0 0 0);
  .normal {
    font-family: var(--font-main);
  }
  .monospace {
    font-family: var(--font-monospace);
  }
}
</style>
