<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-5")
    h1.font-bold.text-2xl You have {{ store.samples.length }} samples
    
    p {{ usedSamplesCount }} of them are currently in use in a synth, kit or an audio track. That means {{ store.samples.length - usedSamplesCount }} are not used at all.
    
    div(class="flex space-x-3")
      h-card(
        class="max-w-md md:flex-1"
        title="Most Used Samples"
        subtitle="Samples get one point each for getting included in a synth, kit or a song. A widely used sample may only belong to one synth, but that synth may be used in lots of places!"
        )
        div(class="divide-y divide-gray-200")
          div(
            v-for="sample in Object.values(store.samples).sort((a, b) => b.usage.total - a.usage.total).slice(0, 19).filter(sample => sample.usage.total > 0)"
            :key="sample.path"
            class="py-2 flex justify-between"
            )
            span {{ sample.usage.total }} - 
              router-link(:to="'/samples/' + sample.id") {{ sample.name.split('.')[0] }}
            play-button(:id="sample.id")

      HListCard(
        v-if="store.missingSamples.length > 0"
        class="max-w-md md:flex-1"
        title="Missing Samples"
        subtitle="These samples were referenced in synths but could not be found."
        :items="store.missingSamples"
        )
        template(#item="{ item }")
          span(class="text-xs text-red-800") {{ item }}

</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from '../deluge/files'
import PlayButton from '../components/PlayButton.vue'

const store = useStore()

const usedSamplesCount = computed(() => {
  return store.samples.map(s => s.usage.total).reduce((a, b) => a + b, 0)
})
</script>