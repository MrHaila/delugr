<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="flex-1 h-full overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sample" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Sample not found! {{ store.samples.length }} samples in total

  div(v-else class="space-y-3")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Sample: {{ sample.name.slice(0, -4) }}
        p(class="text-gray-400 text-sm") {{ sample.path }}
      div(class="text-right text-sm mt-3")
        p Last modified: {{ DateTime.fromMillis(sample.lastModified).toFormat('yyyy-MM-dd') }}
    
    div File size: {{ sample.size }} bytes

    div(class="flex space-x-3")
      h-card(class="max-w-md flex-1")
        template(#title) Usage
        div(v-if="sample.usage.total" class="flex justify-between")
          div
            h2(class="font-semibold") Songs #[h-badge {{ Object.keys(sample.usage.songs).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(bool, key) in sample.usage.songs" :key="key")
                router-link(:to="'/songs/' + key") {{ key }}
          
          div
            h2(class="font-semibold") Kits #[h-badge {{ Object.keys(sample.usage.kits).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(bool, key) in sample.usage.kits" :key="key")
                router-link(:to="'/kits/' + key") {{ key }}
          
          div
            h2(class="font-semibold") Synths #[h-badge {{ Object.keys(sample.usage.sounds).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(bool, key) in sample.usage.sounds" :key="key")
                router-link(:to="'/synths/' + key") {{ key }}
        
        div(v-else class="italic text-gray-400") Not used in any songs or kits.
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