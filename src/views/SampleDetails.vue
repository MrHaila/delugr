<template lang="pug">
page-base
  h1.font-bold.text-2xl Samples (stats inaccurate... I haven't implemented parsing older-than-v3 XMLs yet!)
  div(v-if="store.samples" class="space-y-3")
    p You have {{ Object.keys(store.samples).length }} samples!
    // {{ usedSamples }} of them are currently in use in a song. That means {{ Object.keys(store.samples.files).length - usedSamples }} are not used at all.

    //div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard #[h-badge {{ usedSamples }}]
        div(class="divide-y divide-gray-200")
          div(v-for="entry in Object.entries(store.samples?.files).filter(f => f[1].usage.length > 0).sort((a, b) => b[1].usage.length - a[1].usage.length)" :key="entry[0]" class="py-2")
            div
              span {{ entry[1].usage.length }} - 
              router-link(:to="'samples/' + entry[0]" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry[1].fsFile.name.slice(0, -4) }}
            div(class="text-xs text-gray-400") {{ entry[0] }}

  div(v-else) Thinking...
</template>

<script lang="ts" setup>
import { computed } from '@vue/reactivity';
import { DateTime } from 'luxon'
import { useStore } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])

function filePathToFileName(filePath: string) {
  return filePath.split('/').pop()?.slice(0, -4)
}

const file = computed(() => props.name ? store.samples[props.name]?.file : null)
const sample = computed(() => props.name ? store.samples[props.name] : null)
//const usedSamples = computed(() => Object.values(store.samples.files).reduce((acc, sample) => acc += (sample.usage.length > 0 ? 1 : 0), 0) : 0)
//const sampleUsageCount = computed(() => store.samples?.files[props.name] ? store.samples?.files[props.name].usage.length : 0)
</script>