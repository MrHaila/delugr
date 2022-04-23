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
      p.font-bold Details
      p Last modified: {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
      p Size: {{ file.size }} bytes
      p Type: {{ file.type }}
      p Firmware: {{ parsedSong?.firmwareVersion }} #[span.text-sm.font-light.text-gray-400 (compatible with {{ parsedSong?.firmwareVersion }})]

    h-card(v-if="parsedSong.instruments" class="max-w-md")
      template(#title) Instruments #[badge {{ parsedSong.instruments.length }}]
      div(class="divide-y divide-gray-200")
        div(v-for="(i, index) in parsedSong.instruments" :key="index" class="py-2 flex flex-row")
          div(class="basis-20") {{ tagToName(i.tag) }}
          div {{ i.presetSlot }}{{ i.presetName }}

    div
      p.font-bold Actions
      HButton(variant="primary") Rename Song

    h2.font-bold.text-xl Technical Details
    p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's an interactive tree view of the file so you can see how it all works!

    pre.rounded.bg-gray-300.p-3.text-xs.font-mono
      h3.font-bold RAW SONG ATTRIBUTES
      div {{ store.songs?.files?.[props.name].document.querySelector('song').getAttributeNames().join('\n') }}

</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useStore } from '../store'
import { DateTime } from 'luxon'

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