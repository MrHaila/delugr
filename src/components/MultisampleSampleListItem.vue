<template lang="pug">
div(class="py-2")
  div(v-if="!isRemapped")
    //- Sound name
    div(class="flex flex-row items-center space-x-1")
      MicrophoneIcon(class="h-3 inline")
      span {{ sampleName }}
      exclamation-circle-icon(v-if="!sample" class="h-4 text-red-400")

    //- Sound sample(s)
    // Note: Deluge paths are case insensitive, so we need to mind that.
    div(class="text-xs text-gray-400")
      span(v-if="sample" class="flex justify-between")
        RouterLink(:to="sample.url") {{ sampleRange.fileName }}
        PlayButton(:id="sample.id")
      div(v-else)
        div(class="text-red-800") {{ sampleRange.fileName }}
        div(v-if="samplesWithSimilarNames.length > 0")
          div Similar samples:
          div(v-for="similarSample in samplesWithSimilarNames" :key="similarSample.name" class="flex justify-between")
            div - {{ similarSample.path }}
            a(@click="remapSample(similarSample)" class="cursor-pointer") Remap to this

  div(v-else)
    div(class="text-xs")
      div Sample remapped and saved to disk! #[a(@click="reParseFileStore" class="cursor-pointer") Refresh the UI] to see the changes.
</template>

<script lang="ts" setup>
import type { SampleRange } from '../deluge/core'
import { getSampleByPath, remapSampleInParsedFile, useFiles, type ParsedFile, type SampleFile, reParseFileStore } from '../deluge/files'
import { ExclamationCircleIcon, MicrophoneIcon } from '@heroicons/vue/20/solid'
import PlayButton from './PlayButton.vue'
import { computed, ref } from 'vue'

const store = useFiles()

const props = defineProps<{
  sampleRange: SampleRange
  sourceFile: ParsedFile
}>()

const sampleName = computed(() => sample.value?.name ?? props.sampleRange.fileName.split('/').pop() as string)
const sample = computed(() => getSampleByPath(props.sampleRange.fileName))

const samplesWithSimilarNames = computed(() => {
  return store.samples.filter(s => {
    //console.log(s.name, sampleName.value)
    if (s.name.toLowerCase() === sampleName.value.toLowerCase()) {
      return true
    }
  })
})

const isRemapped = ref(false)

function remapSample(newSample: SampleFile) {
  remapSampleInParsedFile(props.sourceFile, props.sampleRange.fileName, newSample.path)
  isRemapped.value = true
}
  
</script>