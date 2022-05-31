<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.samples.length }} samples
    
    p {{ usedSamplesCount }} of them are currently in use in a synth, kit or an audio track. That means {{ store.samples.length - usedSamplesCount }} are not used at all.
    
    p(class="text-red-800") Attention! {{ store.missingSamples.length }} samples were referenced in synths but could not be found.

    div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard
        template(#subtitle) Samples get one point each for getting included in a synth, kit or a song. A widely used sample may only belong to one synth, but that synth may be used in lots of places!
        div(class="divide-y divide-gray-200")
          div(v-for="sample in Object.values(store.samples).sort((a, b) => b.usage.total - a.usage.total).slice(0, 19).filter(sample => sample.usage.total > 0)" :key="sample.path" class="py-2")
            span {{ sample.usage.total }} - 
            router-link(:to="'/samples/' + sample.id") {{ sample.name.slice(0, -4) }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from '../deluge/files'

const store = useStore()

const usedSamplesCount = computed(() => {
  return store.samples.map(s => s.usage.total).reduce((a, b) => a + b, 0)
})
</script>