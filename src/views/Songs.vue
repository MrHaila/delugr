<template lang="pug">
page-base(
  title="Songs"
  :listItems="store.songs?.navigationList ? store.songs.navigationList : []"
  :active="props.name || ''"
)
  div(v-if="!file" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") ⬅ Select a song to get started

  div(v-else).space-y-3
    h1.font-bold.text-2xl Song: {{ props.name }}
    div
      p Last modified: {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
      // p Size: {{ file.size }} bytes
      // p Type: {{ file.type }}
      p Firmware: {{ parsedSong?.firmwareVersion }} #[span.text-sm.font-light.text-gray-400 (compatible with {{ parsedSong?.firmwareVersion }})]

    div(class="flex space-x-3")
      h-card(v-if="parsedSong.instruments" class="max-w-md md:flex-1")
        template(#title) Instruments #[h-badge {{ parsedSong.instruments.length }}]
        div(class="divide-y divide-gray-200")
          div(v-for="(i, index) in parsedSong.instruments" :key="index" class="py-2 flex flex-row items-center space-x-1")
            div(class="basis-20") {{ tagToName(i.tag) }}
            div(v-if="i.presetSlot") Slot {{ i.presetSlot }}
            div(v-else): router-link(:to="'/synths/' + i.presetName" class="text-blue-500 hover:text-blue-600 hover:underline") {{ i.presetName }}
            exclamation-circle-icon(v-if="i.problem" class="h-4 text-red-400")
      h-card(class="max-w-md md:flex-1")
        template(#title) Actions
        h-button(variant="primary") Rename Song

    //- h2.font-bold.text-xl Technical Details
    //- p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's an interactive tree view of the file so you can see how it all works!

    //- pre.rounded.bg-gray-300.p-3.text-xs.font-mono
    //-   h3.font-bold RAW SONG ATTRIBUTES
    //-   div {{ store.songs?.files?.[props.name].document.querySelector('song').getAttributeNames().join('\n') }}

</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useStore } from '../store'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'

const store = useStore()

const props = defineProps([
  'name'
])

const file = computed(() => props.name ? store.songs?.files[props.name]?.fsFile : null)
const parsedSong = computed(() => props.name ? store.songs?.files[props.name]?.parsedSong : null)

function tagToName(tag: string) {
  switch (tag) {
    case 'sound': return 'Synth'
    case 'kit': return 'Kit'
    default: return tag
  }
}
</script>