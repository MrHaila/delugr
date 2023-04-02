<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!kit" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Kit '{{ props.name }}' not found!

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") #[ArchiveBoxIcon(class="h-5 inline mb-1")] {{ kit.data.presetName }}
        p(class="text-gray-400 text-sm") {{ kit.path }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ kit.firmware }}
        p Last modified: {{ DateTime.fromMillis(kit.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      h-list-card(
        title="Usage"
        :items="kitUsage"
        class="max-w-md md:flex-1"
        emptyLabel="Not used in any songs."
        )
        template(#item="{ item }")
          div(class="flex flex-row space-x-1 items-baseline")
            MusicalNoteIcon(class="h-3 inline mb-1")
            router-link(:to="`/songs/${item}`") {{ item }}

      //- h-card(class="max-w-md md:flex-1")
      //-   template(#title) Song usage #[h-badge {{ kitSongUsageCount }}]
      //-   div(v-if="kitSongUsageCount" class="divide-y divide-gray-200")
      //-     div(v-for="(bool, key) in kit.usage.songs" :key="key" class="py-2")
      //-       router-link(:to="'/songs/' + key") {{ key }}
      //-   div(v-else class="italic text-gray-400") Not used in any songs.

      h-card(v-if="kit.data.soundSources" class="max-w-md md:flex-1")
        template(#title) Samples #[h-badge {{ Object.keys(kit.data.soundSources).length }}]
        div(class="divide-y divide-gray-200")
          sample-row(v-for="(sound, index) in Object.values(kit.data.soundSources)" :key="index" :sound="sound")

    div
      h2(class="font-bold text-gray-500") Technical Details
      p(class="text-sm mb-4 text-gray-500") The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's a dump of what I've managed to parse so far:

      div(class="flex space-x-3" style="font-size: 60%;")
        div(class="rounded bg-gray-100 p-3 font-mono max-w-xl text-gray-600")
          h3(class="font-bold") PARSED KIT DATA
          pre {{ kit.data }}

        div(class="rounded bg-gray-100 p-3 font-mono max-w-xl text-gray-600")
          h3(class="font-bold") RAW KIT DATA
          pre(class="break-all whitespace-pre-wrap") {{ kit.xml }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from '../deluge/files'
import { DateTime } from 'luxon'
import SampleRow from '../components/SampleRow.vue'
import { MusicalNoteIcon } from '@heroicons/vue/20/solid'
import { ArchiveBoxIcon } from '@heroicons/vue/24/solid'

const store = useStore()

const props = defineProps([
  'name'
])

const kit = computed(() => props.name ? store.kits.find(kit => kit.name.split('.')[0] === props.name) : null)

// const file = computed(() => props.name ? store.kits[props.name]?.file : null)
// const parsedKit = computed(() => props.name ? store.kits[props.name]?.data : null)
//const usedKits = computed(() => store.kits?.usage ? Object.keys(store.kits.usage).length : 0)
const kitSongUsageCount = computed(() => kit.value ? Object.keys(kit.value.usage.songs).length : null)
const kitUsage = computed(() => kit.value?.usage?.songs ? Object.keys(kit.value.usage.songs) : [])
</script>