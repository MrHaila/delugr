<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-5")
    h1.font-bold.text-2xl You have {{ fileStore.samples.length }} samples
    
    p {{ usedSamplesCount }} of them are currently in use in a synth, kit or an audio track. That means {{ fileStore.samples.length - usedSamplesCount }} are not used at all.
    
    div(class="flex space-x-3")
      HCard(
        class="max-w-md md:flex-1"
        title="Most Used Samples"
        subtitle="Samples get one point each for getting included in a synth, kit or a song. A widely used sample may only belong to one synth, but that synth may be used in lots of places!"
        )
        div(class="divide-y divide-gray-200")
          div(
            v-for="sample in Object.values(fileStore.samples).sort((a, b) => b.usage.total - a.usage.total).slice(0, 19).filter(sample => sample.usage.total > 0)"
            :key="sample.path"
            class="py-2 flex justify-between items-baseline"
            )
            span {{ sample.usage.total }} points - 
              MicrophoneIcon(class="h-3 inline mb-1 mr-1")
              RouterLink(:to="'/samples/' + sample.id") {{ sample.name.split('.')[0] }}
            play-button(:id="sample.id")

      HListCard(
        v-if="fileStore.missingSamples.length > 0"
        class="max-w-md md:flex-1"
        title="Missing Samples"
        subtitle="These samples were referenced in synths but could not be found."
        :items="fileStore.missingSamples"
        )
        template(#item="{ item }")
          div(class="text-xs")
            div(class="text-red-800") {{ item }}
            //div best guess for the correct path 👇
            //div {{ findLikeliestMatchForMisplacedSample(item).path }}

</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { findLikeliestMatchForMisplacedSample } from '../deluge/files'
import { useFileStore } from '../composables/useFileStore'
import PlayButton from '../components/PlayButton.vue'
import { MicrophoneIcon } from '@heroicons/vue/20/solid'

const { fileStore } = useFileStore()

const usedSamplesCount = computed(() => {
  return fileStore.samples.map(s => s.usage.total).reduce((a, b) => a + b, 0)
})
</script>