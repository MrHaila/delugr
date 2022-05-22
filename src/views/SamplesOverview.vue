<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.samples.length }} samples

    //div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard #[h-badge {{ usedSamples }}]
        div(class="divide-y divide-gray-200")
          div(v-for="entry in Object.entries(store.samples?.files).filter(f => f[1].usage.length > 0).sort((a, b) => b[1].usage.length - a[1].usage.length)" :key="entry[0]" class="py-2")
            div
              span {{ entry[1].usage.length }} - 
              router-link(:to="'samples/' + entry[0]" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry[1].fsFile.name.slice(0, -4) }}
            div(class="text-xs text-gray-400") {{ entry[0] }}

  div(class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") ⬅ Select a sample to get started
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])
</script>