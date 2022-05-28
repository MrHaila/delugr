<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!song" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Song '{{ props.name }}' not found!

  div(v-else class="space-y-3")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") Song: {{ props.name }}
        p(class="text-gray-400 text-sm") {{ song.path }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ song.firmware }}
        p Last modified: {{ DateTime.fromMillis(song.file.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      h-card(v-if="song.data.instruments" class="max-w-md md:flex-1")
        template(#title) Instruments #[h-badge {{ song.data.instruments.length }}]
        div(class="divide-y divide-gray-200")
          div(v-for="(i, index) in song.data.instruments" :key="index" class="py-2 flex flex-row items-center space-x-1")
            div(class="basis-20") {{ i.instrumentType }}
            div(class="flex-auto")
              span {{ i.presetName }}
            div(class="text-right")
              router-link(v-if="i.instrumentType === 'sound' && store.sounds.find(sound => sound.name.slice(0, -4) === i.presetName)" :to="'/synths/' + i.presetName" class="text-xs") View preset
              router-link(v-else-if="i.instrumentType === 'kit' && store.kits.find(kit => kit.name.slice(0, -4) === i.presetName)" :to="'/kits/' + i.presetName" class="text-xs") View preset
              span(v-else class="text-xs text-gray-400") No preset found

            // exclamation-circle-icon(v-if="i.problem" class="h-4 text-red-400")
      
      // h-card(class="max-w-md md:flex-1")
        template(#title) Actions (TBD)
        div(class="space-x-3")
          h-button(variant="primary") Rename Song
          h-button(variant="primary") Delete Song

    h2(class="font-bold text-xl") Technical Details
    p(class="text-sm") The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's a dump of what I've managed to parse so far:

    div(class="flex space-x-3")
      pre(class="rounded bg-gray-300 p-3 text-xs font-mono max-w-4xl")
        h3.font-bold PARSED SONG DATA
        pre {{ song.data }}

      pre(class="rounded bg-gray-300 p-3 text-xs font-mono max-w-4xl")
        h3.font-bold RAW SONG DATA
        pre {{ song.xml }}
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from '../deluge/files'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'
import type { Song } from '../deluge/core';

const store = useStore()

const props = defineProps([
  'name'
])

const song = computed(() => props.name ? store.songs.find(song => song.name.slice(0, -4) === props.name) : null)
</script>