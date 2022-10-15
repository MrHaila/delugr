<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="flex-1 h-full overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sample" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Sample not found! {{ store.samples.length }} samples in total

  div(v-else class="space-y-3")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Sample: {{ sample.name.split('.')[0] }}
          play-button(:id="sample.id" class="ml-4" :large="true")
        p(class="text-gray-400 text-sm") {{ sample.path }}
      div(class="text-right text-sm mt-3")
        p Last modified: {{ DateTime.fromMillis(sample.lastModified).toFormat('yyyy-MM-dd') }}
    
    div File size: {{ sample.size }} bytes

    div(class="flex space-x-3")
      h-card(class="max-w-3xl flex-1")
        template(#title) Usage
        div(v-if="sample.usage.total" class="flex justify-between space-x-3")
          div(class="flex-1")
            h2(class="font-semibold") Songs #[h-badge {{ Object.keys(sample.usage.songs).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(details, key) in sample.usage.songs" :key="key")
                router-link(:to="'/songs/' + key") {{ key }}
                span(class="text-xs text-gray-400")  via {{ details.instrumentName }}
          
          div(class="flex-1")
            h2(class="font-semibold") Kits #[h-badge {{ Object.keys(sample.usage.kits).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(details, key) in sample.usage.kits" :key="key")
                router-link(:to="'/kits/' + key") {{ key }}
                span(class="text-xs text-gray-400")  via {{ details.instrumentName }}
          
          div(class="flex-1")
            h2(class="font-semibold") Synths #[h-badge {{ Object.keys(sample.usage.sounds).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(details, key) in sample.usage.sounds" :key="key")
                router-link(:to="'/synths/' + key") {{ key }}
        
        div(v-else class="italic text-gray-400") Not used in any songs, kits or synths.
</template>

<script lang="ts" setup>
import { computed } from '@vue/reactivity'
import { DateTime } from 'luxon'
import { useStore } from '../deluge/files'
import PlayButton from '../components/PlayButton.vue'

const store = useStore()

const props = defineProps([
  'name'
])

const idAsNumber = computed(() => parseInt(props.name))
const sample = computed(() => props.name ? store.samples.find(sample => sample.id === idAsNumber.value) : null)
</script>