<template lang="pug">
div(class="space-y-3 max-w-3xl p-3")
  h1(class="font-bold text-4xl") Overview
  p Alright, so we got the folder parsed. Here's what we know so far.

  div
    p Songs: {{ store.songs.length }}
    p Synths: {{ store.sounds.length }}
    p Kits: {{ store.kits.length }}
    p Samples: {{ store.samples.length }}

  p The Deluge has three types of entities: songs, kits and synths (internally called 'sounds'). Synths and kits can be saved as presets. Interestingly, songs and kits actually contain full instances (modified copies) of the original preset instead of just a reference to the used preset. This makes tracking usage statistics very complicated, so bear with me as I figure this out!
  
  p(class="text-gray-400")
    div There are sure to be obvious bugs and missing stuff. Feel free to report them in the repo and maybe even help out by leaving a PR!
    div P.S. I don't have any firmware v1 or v2 songs to test with. Send me one if you have one!

  div(class="w-96")
    h2(class="font-bold text-xl") Skipped Files #[h-badge {{ store.skippedFiles.length }}]
    ul(class="text-gray-400 w-96 space-y-2 text-sm")
      li(v-for="file in store.skippedFiles")
        div(class="text-red-800") {{ file.name }}
        div(class="text-gray-400") {{ file.reason }}
</template>

<script lang="ts" setup>
import { DateTime } from 'luxon'
import { useStore } from '../deluge/files'

const store = useStore()
</script>