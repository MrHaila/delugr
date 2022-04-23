<template lang="pug">
page-base(
  :list="{ title: 'Synths', listItems: store.synths ? Object.keys(store.synths.files).map(key => ({ url: `/synths/${key}`, name: key, active: props?.name === key, date: DateTime.fromMillis(store.synths?.files[key].fsFile.lastModified) })).sort((a, b) => a.name.localeCompare(b.name)) : [] }"
)
  div(v-if="!file" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") ⬅ Select a synth to get started

  div(v-else).space-y-3
    h1.font-bold.text-2xl Synth: {{ props.name }}
    div
      p.font-bold Details
      p Last modified: {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
      p Size: {{ file.size }} bytes
      p Type: {{ file.type }}
      p
        span(v-if="parsedSynth") Firmware: {{ parsedSynth?.firmwareVersion }} #[span.text-sm.font-light.text-gray-400 (compatible with {{ parsedSynth?.firmwareVersion }})]
        span(v-else) Firmware: Unknown

    //h-card(v-if="parsedSynth.instruments" class="max-w-md")
      template(#title) Instruments #[badge {{ parsedSynth.instruments.length }}]
      div(class="divide-y divide-gray-200")
        div(v-for="(i, index) in parsedSynth.instruments" :key="index" class="py-2 flex flex-row")
          div(class="basis-20") {{ tagToName(i.tag) }}
          div {{ i.presetSlot }}{{ i.presetName }}

    p.font-bold Actions
    HButton(variant="primary") Rename Synth

    h2.font-bold.text-xl Technical Details
    p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's an interactive tree view of the file so you can see how it all works!

    div(class="rounded bg-gray-200 border text-sm font-mono p-3")
      pre(v-if="parsedSynth")
        h3.font-bold RAW SONG ATTRIBUTES
        code {{ parsedSynth }}
      div(v-else) I don't know how to parse this song file 😢
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useStore } from '../store'
import { DateTime } from 'luxon'

const store = useStore()

const props = defineProps([
  'name'
])

const file = computed(() => props.name ? store.synths?.files[props.name].fsFile : null)
const parsedSynth = computed(() => props.name ? store.synths?.files[props.name].parsedSynth : null)
</script>