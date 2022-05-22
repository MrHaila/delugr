<template lang="pug">
section(ria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.kits.length }} kits
    //p {{ usedKits }} of them are currently in use in a song. That means {{ store.kits?.navigationList.length - usedKits }} are not used at all.
  
    //div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard #[h-badge {{ usedKits }}]
        div(class="divide-y divide-gray-200")
          div(v-for="entry in Object.entries(store.kits?.usage).sort((a, b) => b[1].length - a[1].length)" :key="entry[0]" class="py-2")
            span {{ entry[1].length }} - 
            router-link(:to="'/kits/' + entry[0]" class="text-blue-500 hover:text-blue-600 hover:underline") {{ entry[0] }}

  div(class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") ⬅ Select a kit to get started
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])
</script>