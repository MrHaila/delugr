<template lang="pug">
page-base(
  title="Synths"
  :listItems="store.sounds"
  :active="props.name || ''"
)
  //- Synth home page (nothing selected) ----------------
  div(v-if="!file && usedSynths" class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.sounds.length }} synths
    p {{ usedSynths }} of them are currently in use in a song. That means {{ store.sounds.length - usedSynths }} are not used at all.

    //div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard #[h-badge {{ usedSynths }}]
        div(class="divide-y divide-gray-200")
          div(v-for="entry in Object.entries(store.sounds).sort((a, b) => b[1].length - a[1].length)" :key="entry[0]" class="py-2")
            span {{ entry[1].length }} - 
            router-link(:to="'/synths/' + entry[0]" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry[0] }}

  //- Synth details page --------------------------------
  div(v-else-if="file && synth && usedSynths").space-y-3
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Synth: {{ props.name }}
        // p Last modified: {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
      div(class="text-right origin-bottom flex flex-col-reverse")
        //p.text-sm.font-light.text-gray-400 Compatible back to {{ synth?.firmwareVersion }}
        p Firmware: {{ file.firmware }}

    div(class="flex space-x-3")
      //h-card(class="max-w-md md:flex-1")
        template(#title) Song usage #[h-badge {{ synthSongUsageCount }}]
        div(v-if="synthSongUsageCount > 0" class="divide-y divide-gray-200")
          div(v-for="entry in store.synths?.usage[props.name]" :key="entry" class="py-2")
            router-link(:to="'/songs/' + entry" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry }}
        div(v-else class="italic text-gray-400") Not used in any songs.

      h-card(v-if="synth" class="max-w-md md:flex-1")
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

const file = computed(() => props.name ? store.sounds[props.name] : null)
const synth = computed(() => props.name ? store.sounds[props.name]?.data : null)
const usedSynths = computed(() => Object.keys(store.sounds[props.name]?.usage.songs).length + Object.keys(store.sounds[props.name].usage.kits).length)
const synthSongUsageCount = computed(() => Object.keys(store.sounds[props.name]?.usage.songs).length)
</script>