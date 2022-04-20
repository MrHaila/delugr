<template lang="pug">
div.p-5(v-if="!file").font-bold.text-2xl File not found 😢
div.p-5(v-else).space-y-3
  h1.font-bold.text-2xl Song: {{ key }}
  div
    p.font-bold Details
    p Last modified: {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
    p Size: {{ file.size }} bytes
    p Type: {{ file.type }}
    p Firmware: {{ parsedSong?.firmwareVersion }} #[span.text-sm.font-light.text-gray-400 (compatible with {{ parsedSong?.firmwareVersion }})]

  div
    p.font-bold(v-if="parsedSong.instruments") Instruments
    div(v-for="(i, index) in parsedSong.instruments" :key="index")
      p {{ i.tag }}: {{ i.presetSlot }}{{ i.presetName }}
      //p Polyphonic: {{ i.polyphonic }}
      //p {{ i.attributes}}

  div
    p.font-bold Actions
    HButton(variant="primary") Rename Song

  h2.font-bold.text-xl Technical Details
  p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's an interactive tree view of the file so you can see how it all works!

  pre.rounded.bg-gray-300.p-3.text-xs.font-mono
    h3.font-bold RAW SONG ATTRIBUTES
    div {{ store.songs?.files?.[key].document.querySelector('song').getAttributeNames().join('\n') }}

</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { DateTime } from 'luxon'
import HButton from '../components/HButton.vue'

const route = useRoute()
const store = useStore()

const key = computed(() => String(route.params.name))

const file = store.songs?.files?.[key.value].fsFile
const parsedSong = store.songs?.files[key.value].parsedSong

</script>