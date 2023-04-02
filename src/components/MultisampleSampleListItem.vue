<template lang="pug">
div(class="py-2")
  //- Sound name
  div(class="flex flex-row items-center space-x-1")
    MicrophoneIcon(class="h-3 inline")
    span {{ sampleName }}
    exclamation-circle-icon(v-if="!sample" class="h-4 text-red-400")

  //- Sound sample(s)
  // Note: Deluge paths are case insensitive, so we need to mind that.
  div(class="text-xs text-gray-400")
    span(v-if="sample" class="flex justify-between")
      router-link(:to="sample.url") {{ sampleRange.fileName }}
      PlayButton(:id="sample.id")
    span(v-else class="text-red-800") {{ sampleRange.fileName }}
</template>

<script lang="ts" setup>
import type { SampleRange } from '../deluge/core'
import { getSampleByPath } from '../deluge/files'
import { ExclamationCircleIcon, MicrophoneIcon } from '@heroicons/vue/20/solid'
import PlayButton from './PlayButton.vue'
import { computed } from 'vue'

const props = defineProps<{
  sampleRange: SampleRange
}>()

const sampleName = computed(() => sample.value?.name || props.sampleRange.fileName.split('/').pop())
const sample = computed(() => getSampleByPath(props.sampleRange.fileName))
</script>