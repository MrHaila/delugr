<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ fileStore.kits.length }} kit presets
    p {{ inSongsCount }} of them have Instances in a song. The other {{ fileStore.kits.length - inSongsCount }} are not in any song.
  
    div(class="flex")
      HCard(class="max-w-md md:flex-1" subtitle="Songs with an Instance derived from the preset (same name).")
        template(#title) Leaderboard
        div(class="divide-y divide-gray-200")
          div(v-for="{ kit, songs } in leaderboard" :key="kit.path" class="py-2")
            span {{ songs }} - 
            RouterLink(:to="kit.url") {{ kit.name.split('.')[0] }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useFileStore } from '../composables/useFileStore'
import { isPresetInAnySong, songsDerivedFromPreset } from '../deluge/usage'

const { fileStore } = useFileStore()

const inSongsCount = computed(() => fileStore.kits.filter(isPresetInAnySong).length)

const leaderboard = computed(() => fileStore.kits
  .map(kit => ({ kit, songs: songsDerivedFromPreset(kit).length }))
  .filter(entry => entry.songs > 0)
  .sort((a, b) => b.songs - a.songs)
  .slice(0, 20))
</script>
