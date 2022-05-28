<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sample" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Sample not found! {{ store.samples.length }} samples in total

  div(v-else class="space-y-3")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Sample: {{ sample.name.slice(0, -4) }}
        p(class="text-gray-400 text-sm") {{ sample.path }}
      div(class="text-right text-sm mt-3")
        p Last modified: {{ DateTime.fromMillis(sample.file.lastModified).toFormat('yyyy-MM-dd') }}
    
    div File size: {{ sample.file.size }} bytes
</template>

<script lang="ts" setup>
import { computed } from '@vue/reactivity';
import { DateTime } from 'luxon'
import { useStore } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])

const idAsNumber = computed(() => parseInt(props.name))
const sample = computed(() => props.name ? store.samples.find(sample => sample.id === idAsNumber.value) : null)
</script>