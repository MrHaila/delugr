<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sound" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Synth '{{ props.name }}' not found!

  div(v-else class="space-y-3")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Synth: {{ sound.data.presetName }}
        p Last modified: {{ DateTime.fromMillis(sound.file.lastModified).toFormat('yyyy-MM-dd') }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ sound.firmware }}

    div(class="flex space-x-3")
      h-card(class="max-w-md md:flex-1")
        template(#title) Song usage #[h-badge {{ synthSongUsageCount }}]
        div(v-if="synthSongUsageCount" class="divide-y divide-gray-200")
          div(v-for="(bool, key) in store.sounds[props.name].usage.songs" :key="key" class="py-2")
            router-link(:to="'/songs/' + key" class="text-blue-500 hover:text-blue-600 hover:underline") {{ key }}
        div(v-else class="italic text-gray-400") Not used in any songs.

      h-card(class="max-w-md md:flex-1")
        template(#title) Synth Settings
        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row")
            div(class="basis-40") Synthesis mode
            div {{ sound.data.mode }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Voice priority
            div {{ sound.data.voicePriority }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Polyphonic
            div {{ sound.data.polyphonic }}
    
    div(class="flex space-x-3")
      h-card
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

      h-card(class="max-w-md md:flex-1")
        template(#title) Actions (TBD)
        div(class="space-x-3")
          h-button(variant="primary") Rename Synth
          h-button(variant="primary") Delete Synth

    h2(class="font-bold text-xl") Technical Details
    p(class="text-sm") The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's a dump of what I've managed to parse so far:

    div(class="flex space-x-3")
      pre.rounded.bg-gray-300.p-3.text-xs.font-mono
        h3.font-bold PARSED SYNTH DATA
        pre {{ sound.data }}

      pre.rounded.bg-gray-300.p-3.text-xs.font-mono
        h3.font-bold RAW SYNTH DATA
        pre {{ sound.xml }}

  //- Synth details page --------------------------------
  //div().space-y-3
    div(class="flex flex-row justify-between")


    // h-card(v-if="synth")
      template(#title) Envelope 1
      div(class="divide-y divide-gray-200")
        div(class="py-2 flex flex-row")
          div(class="basis-40") Attack
          div {{ synth.env1.attack.decimal }} - {{ synth.env1.attack.fixh }}
        div(class="py-2 flex flex-row")
          div(class="basis-40") Decay
          div {{ synth.env1.decay.decimal }} - {{ synth.env1.decay.fixh }}
        div(class="py-2 flex flex-row")
          div(class="basis-40") Sustain
          div {{ synth.env1.sustain.decimal }} - {{ synth.env1.sustain.fixh }}
        div(class="py-2 flex flex-row")
          div(class="basis-40") Release
          div {{ synth.env1.release.decimal }} - {{ synth.env1.release.fixh }}

    // h-card(class="max-w-md md:flex-1")
      template(#title) Actions (TBD)
      div(class="space-x-3")
        h-button(variant="primary") Rename Synth
        h-button(variant="primary") Delete Synth

    //- h2.font-bold.text-xl Technical Details
    //- p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's an interactive tree view of the file so you can see how it all works!

    div(class="rounded bg-gray-200 border text-sm font-mono p-3")
      pre(v-if="synth")
        h3.font-bold RAW SYNTH DATA (not all values have been parsed yet. Help much appreciated!)
        code {{ synth }}
      div(v-else) I don't know how to parse this synth file 😢

    div(v-else class="space-y-3")
      h1.font-bold.text-2xl Synth: {{ props.name }}
      p.text-gray-500 I don't know how to parse this synth file 😢

      //h-card(class="max-w-md md:flex-1")
        template(#title) Song usage #[h-badge {{ synthSongUsageCount }}]
        div(v-if="synthSongUsageCount > 0" class="divide-y divide-gray-200")
          div(v-for="entry in store.synths?.usage[props.name]" :key="entry" class="py-2")
            router-link(:to="'/songs/' + entry" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry }}
        div(v-else class="italic text-gray-400") Not used in any songs.
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useStore } from '../deluge/files'
import { DateTime } from 'luxon'

const store = useStore()

const props = defineProps([
  'name'
])


const sound = computed(() => props.name ? store.sounds.find(sound => sound.name.slice(0, -4) === props.name) : null)

const usedSynths = computed(() => Object.keys(store.sounds[props.name]?.usage.songs).length + Object.keys(store.sounds[props.name].usage.kits).length)
const synthSongUsageCount = computed(() => sound.value ? Object.keys(sound.value.usage.songs).length : null)
</script>