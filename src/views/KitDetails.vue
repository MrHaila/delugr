<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!kit" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Kit '{{ props.name }}' not found!

  div(v-else class="space-y-3")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") Kit: {{ kit.data.presetName }}
        p(class="text-gray-400 text-sm") {{ kit.path }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ kit.firmware }}
        p Last modified: {{ DateTime.fromMillis(kit.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      h-card(class="max-w-md md:flex-1")
        template(#title) Song usage #[h-badge {{ kitSongUsageCount }}]
        div(v-if="kitSongUsageCount" class="divide-y divide-gray-200")
          div(v-for="(bool, key) in kit.usage.songs" :key="key" class="py-2")
            router-link(:to="'/songs/' + key") {{ key }}
        div(v-else class="italic text-gray-400") Not used in any songs.

      h-card(v-if="kit.data.soundSources" class="max-w-md md:flex-1")
        template(#title) Sounds #[h-badge {{ Object.keys(kit.data.soundSources).length }}]
        div(class="divide-y divide-gray-200")
          div(v-for="(i, index) in Object.values(kit.data.soundSources)" :key="index" class="py-2")
            div(class="flex flex-row items-center space-x-1")
              span {{ i.presetName }}
              exclamation-circle-icon(v-if="i.problem" class="h-4 text-red-400")

            // Note: Deluge paths are case insensitive, so we need to mind that.
            div(class="text-xs text-gray-400")
              router-link(v-if="getSampleUrlbyPath(i.osc1.fileName)" :to="getSampleUrlbyPath(i.osc1.fileName)") {{ i.osc1.fileName }}
              span(v-else class="text-red-800") {{ i.osc1.fileName }}
            div(class="text-xs text-gray-400")
              router-link(v-if="getSampleUrlbyPath(i.osc2.fileName)" :to="getSampleUrlbyPath(i.osc2.fileName)") {{ i.osc2.fileName }}
              span(v-else class="text-red-800") {{ i.osc2.fileName }}

    h2(class="font-bold text-xl") Technical Details
    p(class="text-sm") The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's a dump of what I've managed to parse so far:

    div(class="flex space-x-3")
      pre.rounded.bg-gray-300.p-3.text-xs.font-mono
        h3.font-bold PARSED SYNTH DATA
        pre {{ kit.data }}

      pre.rounded.bg-gray-300.p-3.text-xs.font-mono
        h3.font-bold RAW SYNTH DATA
        pre {{ kit.xml }}
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from '../deluge/files'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'
import { getSampleUrlbyPath } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])

const kit = computed(() => props.name ? store.kits.find(kit => kit.name.slice(0, -4) === props.name) : null)

// const file = computed(() => props.name ? store.kits[props.name]?.file : null)
// const parsedKit = computed(() => props.name ? store.kits[props.name]?.data : null)
//const usedKits = computed(() => store.kits?.usage ? Object.keys(store.kits.usage).length : 0)
const kitSongUsageCount = computed(() => kit.value ? Object.keys(kit.value.usage.songs).length : null)
</script>