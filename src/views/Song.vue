<template lang="pug">
div.p-5(v-if="!file").font-bold.text-2xl File not found 😢
div.p-5(v-else).space-y-3
  h1.font-bold.text-2xl Song: {{ key }}
  div
    p.font-bold Details
    p Last modified: {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
    p Size: {{ file.size }} bytes
    p Type: {{ file.type }}
    p Firmware: {{ xmlSong?.getAttribute('firmwareVersion') }} #[span.text-sm.font-light.text-gray-400 (compatible with {{ xmlSong?.getAttribute('earliestCompatibleFirmware') }})]

  div
    p.font-bold(v-if="instruments") Instruments
    //p {{ instruments }}
    div(v-for="(i, index) in instruments" :key="index")
      p {{ i.tag }}: {{ i.preset }}
      //p Polyphonic: {{ i.polyphonic }}
      //p {{ i.attributes}}

  div
    p.font-bold Actions
    HButton(variant="primary") Rename Song

  //pre.rounded.bg-gray-300.p-3.text-xs.font-mono(v-if="xmlInstruments")
    h3.font-bold INSTRUMENTS
    div {{ collectionToArray(xmlInstruments) }}

  h2.font-bold.text-xl Technical Details
  p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's an interactive tree view of the file so you can see how it all works!

  pre.rounded.bg-gray-300.p-3.text-xs.font-mono
    h3.font-bold RAW SONG
    div {{ xmlSong?.getAttributeNames().join('\n') }}

</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { DateTime } from 'luxon'
import HButton from '../components/HButton.vue'

const route = useRoute()
const store = useStore()

const key = String(route.params.name)

// File might not be available yet
const file = computed(() => {
  return store?.songs?.files[key]?.file
})

const xmlDoc = ref<Document>()

const xmlSong = computed(() => {
  return xmlDoc.value?.getElementsByTagName('song').item(0)
})

const xmlInstruments = computed(() => {
  return xmlSong.value?.getElementsByTagName('instruments').item(0)?.children
})

const instruments = computed(() => {
  if (!xmlInstruments.value) return []
  return collectionToArray(xmlInstruments.value).map(i => {
    return {
      tag: i.tagName,
      preset: i.hasAttribute('presetSlot') ? i.getAttribute('presetSlot') : i.getAttribute('presetName'),
      //polyphonic: i.getAttribute('polyphonic'),
      //attributes: Array.from(i.attributes).map(a => `${a.name}: ${a.value}`)
    }
  })
})

const parser = new DOMParser()

async function refreshFile () {
  const file = store?.songs?.files[key]?.file
  if (!file || file.type !== 'text/xml') return

  const xml = await file.text()
  const document = parser.parseFromString(xml, "text/xml")

  console.log(document)
  xmlDoc.value = document

  // if (store.songs?.files[key]) {
  //   store.songs.files[key].content = document
  // }
}

refreshFile()

function collectionToArray (list: HTMLCollection) {
  return Array.from(list)
}

</script>