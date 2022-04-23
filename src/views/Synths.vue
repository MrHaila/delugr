<template lang="pug">
page-base(
  title="Synths"
  :listItems="store.synths?.navigationList ? store.synths.navigationList : []"
  :active="props.name || ''"
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
        span(v-if="synth") Firmware: {{ synth?.firmwareVersion }} #[span.text-sm.font-light.text-gray-400 (compatible with {{ synth?.firmwareVersion }})]
        span(v-else) Firmware: Unknown

    h-card(v-if="synth" class="max-w-md")
      template(#title) Synth Settings
      div(class="divide-y divide-gray-200")
        div(class="py-2 flex flex-row")
          div(class="basis-40") Synthesis mode
          div {{ synth.mode }}
        div(class="py-2 flex flex-row")
          div(class="basis-40") Voice priority
          div {{ synth.voicePriority }}
        div(class="py-2 flex flex-row")
          div(class="basis-40") Polyphonic
          div {{ synth.polyphonic }}

    p.font-bold Actions
    HButton(variant="primary") Rename Synth

    //- h2.font-bold.text-xl Technical Details
    //- p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's an interactive tree view of the file so you can see how it all works!

    div(class="rounded bg-gray-200 border text-sm font-mono p-3")
      pre(v-if="synth")
        h3.font-bold RAW SONG ATTRIBUTES
        code {{ synth }}
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

const file = computed(() => props.name ? store.synths?.files[props.name]?.fsFile : null)
const synth = computed(() => props.name ? store.synths?.files[props.name]?.parsedSynth : null)
</script>