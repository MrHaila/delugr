<template lang="pug">
page-base(
  title="Kits"
  :listItems="store.kits?.navigationList ? store.kits.navigationList : []"
  :active="props.name || ''"
  :usage="store.kits?.usage"
)
  div(v-if="!file && usedKits" class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.kits?.navigationList.length }} kits
    p {{ usedKits }} of them are currently in use in a song. That means {{ store.kits?.navigationList.length - usedKits }} are not used at all.

    div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard #[h-badge {{ usedKits }}]
        div(class="divide-y divide-gray-200")
          div(v-for="entry in Object.entries(store.kits?.usage).sort((a, b) => b[1].length - a[1].length)" :key="entry[0]" class="py-2")
            span {{ entry[1].length }} - 
            router-link(:to="'/synths/' + entry[0]" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry[0] }}

  div(v-else-if="file && parsedKit && usedKits").space-y-3
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Kit: {{ props.name }}
        p Last modified: {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
      div(v-if="parsedKit?.firmwareVersion !== 'null'" class="text-right origin-bottom flex flex-col-reverse")
        p.text-sm.font-light.text-gray-400 Compatible back to {{ parsedKit?.firmwareVersion }}
        p Firmware: {{ parsedKit?.firmwareVersion }}

    div(class="flex space-x-3")
      h-card(class="max-w-md md:flex-1")
        template(#title) Song usage #[h-badge {{ kitSongUsageCount }}]
        div(v-if="kitSongUsageCount > 0" class="divide-y divide-gray-200")
          div(v-for="entry in store.kits?.usage[props.name]" :key="entry" class="py-2")
            router-link(:to="'/songs/' + entry" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry }}
        div(v-else class="italic text-gray-400") Not used in any songs.

      h-card(v-if="parsedKit?.soundSources" class="max-w-md md:flex-1")
        template(#title) Sounds #[h-badge {{ parsedKit.soundSources.length }}]
        div(class="divide-y divide-gray-200")
          div(v-for="(i, index) in parsedKit.soundSources" :key="index" class="py-2 flex flex-row items-center space-x-1")
            span {{ index + 1 }} - {{ i.name }}
            exclamation-circle-icon(v-if="i.problem" class="h-4 text-red-400")

</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from '../store'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'

const store = useStore()

const props = defineProps([
  'name'
])

const file = computed(() => props.name ? store.kits?.files[props.name]?.fsFile : null)
const parsedKit = computed(() => props.name ? store.kits?.files[props.name]?.parsedKit : null)
const usedKits = computed(() => store.kits?.usage ? Object.keys(store.kits.usage).length : 0)
const kitSongUsageCount = computed(() => store.kits?.usage[props.name] ? store.kits?.usage[props.name].length : 0)
</script>