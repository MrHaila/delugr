<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-5")
    h1.font-bold.text-2xl You have {{ fileStore.samples.length }} samples
    
    p {{ usedSamplesCount }} of them are referenced by a preset, song Instance, Drum or Recording. The other {{ fileStore.samples.length - usedSamplesCount }} are unused samples: nothing on the card points to them.
    
    div(class="flex space-x-3")
      HCard(
        class="max-w-md md:flex-1"
        title="Most Used Samples"
        subtitle="Number of files (songs, synths and kits) that reference the sample."
        )
        div(class="divide-y divide-gray-200")
          div(
            v-for="{ sample, count } in mostUsed"
            :key="sample.path"
            class="py-2 flex justify-between items-baseline"
            )
            span {{ count }} files - 
              MicrophoneIcon(class="h-3 inline mb-1 mr-1")
              RouterLink(:to="sample.url") {{ sample.name.split('.')[0] }}
            play-button(:id="sample.id")

      HCard(
        class="max-w-md md:flex-1"
        title="Most Used Samples in Drums"
        subtitle="Number of kits (presets and song Instances) with a Drum that references the sample."
        )
        div(class="divide-y divide-gray-200")
          div(
            v-for="{ sample, count } in mostUsedInDrums"
            :key="sample.path"
            class="py-2 flex justify-between items-baseline"
            )
            span {{ count }} kits - 
              MicrophoneIcon(class="h-3 inline mb-1 mr-1")
              RouterLink(:to="sample.url") {{ sample.name.split('.')[0] }}
            play-button(:id="sample.id")

      MissingSamplesCard(
        v-if="fileStore.missingSamples.length > 0"
        class="max-w-md md:flex-1"
        :missingSamples="fileStore.missingSamples"
        )
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useFileStore, type SampleFile, type SampleReference } from '../composables/useFileStore'
import PlayButton from '../components/PlayButton.vue'
import MissingSamplesCard from '../components/MissingSamplesCard.vue'
import { MicrophoneIcon } from '@heroicons/vue/20/solid'

const { fileStore } = useFileStore()

const usedSamplesCount = computed(() => fileStore.samples.filter(sample => sample.usage.length > 0).length)

/**
 * Top samples by the number of distinct owners (keyed by `ownerKey`) among references passing `filter`.
 */
function leaderboard(filter: (ref: SampleReference) => boolean, ownerKey: (ref: SampleReference) => string) {
  return fileStore.samples
    .map(sample => ({ sample, count: new Set(sample.usage.filter(filter).map(ownerKey)).size }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 40) as { sample: SampleFile, count: number }[]
}

const mostUsed = computed(() => leaderboard(() => true, ref => ref.owner.filePath))
const mostUsedInDrums = computed(() => leaderboard(ref => ref.owner.drumName !== null, ref => `${ref.owner.filePath}|${ref.owner.instrumentName}`))
</script>
