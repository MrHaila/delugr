<template lang="pug">
div(class="py-2")
  //- Sound name
  div(class="flex flex-row items-center space-x-1")
    span {{ sound.presetName }}
    exclamation-circle-icon(v-if="sound.problem" class="h-4 text-red-400")

  //- Sound sample(s)
  // Note: Deluge paths are case insensitive, so we need to mind that.
  div(class="text-xs text-gray-400")
    span(v-if="sample1" class="flex justify-between")
      router-link(:to="sample1.url") {{ sound.osc1.fileName }}
      PlayButton(:id="sample1.id")
    span(v-else class="text-red-800") {{ sound.osc1.fileName }}
  div(class="text-xs text-gray-400")
    span(v-if="sample2" class="flex justify-between")
      router-link(:to="sample2.url") {{ sound.osc2.fileName }}
      PlayButton(:id="sample2.id")
    span(v-else class="text-red-800") {{ sound.osc2.fileName }}
</template>

<script lang="ts" setup>
import type { Sound } from '../deluge/core'
import { getSampleByPath } from '../deluge/files'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'
import PlayButton from './PlayButton.vue'
import { computed } from 'vue'

interface Props {
  sound: Sound
}

const props = defineProps<Props>()

const sample1 = computed(() => getSampleByPath(props.sound.osc1.fileName))
const sample2 = computed(() => getSampleByPath(props.sound.osc2.fileName))
</script>