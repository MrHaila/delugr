<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sound" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Synth '{{ props.name }}' not found!

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") Synth: {{ sound.data.presetName }}
        p(class="text-gray-400 text-sm") {{ sound.path }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ sound.firmware }}
        p Last modified: {{ DateTime.fromMillis(sound.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      h-card(class="max-w-md flex-1")
        template(#title) Usage #[h-badge {{ synthSongUsageCount }}]
        div(v-if="synthSongUsageCount" class="divide-y divide-gray-200")
          div(v-for="(bool, key) in sound.usage.songs" :key="key" class="py-2 flex flex-row items-center space-x-1")
            div(class="basis-20")
              span song
            router-link(:to="'/songs/' + key") {{ key }}
          div(v-for="(bool, key) in sound.usage.kits" :key="key" class="py-2 flex flex-row items-center space-x-1")
            div(class="basis-20")
              span kit
            router-link(:to="'/kits/' + key") {{ key }}
        div(v-else class="italic text-gray-400") Not used in any songs or kits.

      h-card(class="max-w-md flex-1")
        template(#title) Synth Settings
        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row")
            div(class="basis-20") Synthesis mode
            div {{ sound.data.mode }}
          div(class="py-2 flex flex-row")
            div(class="basis-20") Voice priority
            div {{ sound.data.voicePriority }}
          div(class="py-2 flex flex-row")
            div(class="basis-20") Polyphony
            div {{ sound.data.polyphonic }}

    div(class="flex space-x-3")
      h-card(class="max-w-md flex-1")
        template(#title) Oscillator 1
        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row")
            div(class="basis-20") Type
            div {{ sound.data.osc1.sampleRanges ? 'multisample' : sound.data.osc1.type }}
          div(class="py-2 flex flex-row" v-if="sound.data.osc1.transpose")
            div(class="basis-20") Transpose
            div {{ sound.data.osc1.transpose }}
          div(class="py-2 flex flex-row" v-if="sound.data.osc1.fileName || sound.data.osc1.sampleRanges")
            div(class="basis-20") Sample(s)
            div(class="text-xs")
              router-link(v-if="sound.data.osc1.fileName" :to="String(getSampleUrlByPath(sound.data.osc1.fileName))") {{ sound.data.osc1.fileName }}
              div(v-for="range in sound.data.osc1.sampleRanges")
                router-link(v-if="getSampleUrlByPath(range.fileName)" :to="String(getSampleUrlByPath(range.fileName))") {{ range.fileName }}
                span(v-else class="text-red-800") {{ range.fileName }}

      h-card(class="max-w-md flex-1")
        template(#title) Oscillator 2
        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row")
            div(class="basis-20") Type
            div {{ sound.data.osc2.sampleRanges ? 'multisample' : sound.data.osc2.type }}
          div(class="py-2 flex flex-row" v-if="sound.data.osc2.transpose")
            div(class="basis-20") Transpose
            div {{ sound.data.osc2.transpose }}
          div(class="py-2 flex flex-row" v-if="sound.data.osc2.fileName || sound.data.osc2.sampleRanges")
            div(class="basis-20") Sample(s)
            div(class="text-xs")
              router-link(v-if="sound.data.osc2.fileName" :to="String(getSampleUrlByPath(sound.data.osc2.fileName))") {{ sound.data.osc2.fileName }}
              div(v-for="range in sound.data.osc2.sampleRanges")
                router-link(v-if="getSampleUrlByPath(range.fileName)" :to="String(getSampleUrlByPath(range.fileName))") {{ range.fileName }}
                span(v-else class="text-red-800") {{ range.fileName }}
    
    div(class="flex space-x-3")
      //h-card
        template(#title) Envelope 1
        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row")
            div(class="basis-40") Attack
            div {{ sound.data.env1?.attack.decimal }} - {{ sound.data.env1?.attack.fixh }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Decay
            div {{ sound.data.env1?.decay.decimal }} - {{ sound.data.env1?.decay.fixh }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Sustain
            div {{ sound.data.env1?.sustain.decimal }} - {{ sound.data.env1?.sustain.fixh }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Release
            div {{ sound.data.env1?.release.decimal }} - {{ sound.data.env1?.release.fixh }}

      //h-card(class="max-w-md md:flex-1")
        template(#title) Actions (TBD)
        div(class="space-x-3")
          h-button(variant="primary") Rename Synth
          h-button(variant="primary") Delete Synth

    h2(class="font-bold text-xl") Technical Details
    p(class="text-sm") The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's a dump of what I've managed to parse so far:

    div(class="flex space-x-3" style="font-size: 60%;")
      div(class="rounded bg-gray-300 p-3 font-mono max-w-xl")
        h3(class="font-bold") PARSED SYNTH DATA
        pre {{ sound.data }}

      div(class="rounded bg-gray-300 p-3 font-mono max-w-xl")
        h3(class="font-bold") RAW SYNTH DATA
        pre(class="break-all whitespace-pre-wrap") {{ sound.xml }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from '../deluge/files'
import { DateTime } from 'luxon'
import { getSampleUrlByPath } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])


const sound = computed(() => props.name ? store.sounds.find(sound => sound.name.split('.')[0] === props.name) : null)
const synthSongUsageCount = computed(() => sound.value?.usage ? Object.keys(sound.value.usage.songs).length : null)
</script>