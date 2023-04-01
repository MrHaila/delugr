<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="flex-1 h-full overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sample" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Sample not found! {{ store.samples.length }} samples in total

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Sample: {{ sample.name.split('.')[0] }}
          play-button(:id="sample.id" class="ml-4 relative bottom-1" :large="true")
        p(class="text-gray-400 text-sm") {{ sample.path }} #[span(class="text-xs") ({{ filesize(sample.size) }})]
      div(class="text-right text-sm mt-3")
        p Last modified: {{ DateTime.fromMillis(sample.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      h-card(class="max-w-3xl flex-1")
        template(#title) Usage
        div(v-if="sample.usage.total" class="flex justify-between space-x-3")
          div(class="flex-1")
            h-list(
              title="Songs"
              :object="sample.usage.songs"
              )
              template(#item="{ item }")
                router-link(:to="'/songs/' + item.key") {{ item.key }}
                span(class="text-xs text-gray-400")  via {{ item.value.instrumentName }}
          
          div(class="flex-1")
            h-list(
              title="Kits"
              :object="sample.usage.kits"
              )
              template(#item="{ item }")
                router-link(:to="'/kits/' + item.key") {{ item.key }}
                span(class="text-xs text-gray-400")  via {{ item.value.instrumentName }}
          
          div(class="flex-1")
            h-list(
              title="Synths"
              :object="sample.usage.sounds"
              )
              template(#item="{ item }")
                router-link(:to="'/synths/' + item.key") {{ item.key }}
        
        div(v-else class="italic text-gray-400") Not used in any songs, kits or synths.
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { DateTime } from 'luxon'
import { useStore } from '../deluge/files'
import PlayButton from '../components/PlayButton.vue'
import { filesize } from 'filesize'

const store = useStore()

const props = defineProps([
  'name'
])

const idAsNumber = computed(() => parseInt(props.name))
const sample = computed(() => props.name ? store.samples.find(sample => sample.id === idAsNumber.value) : null)
</script>