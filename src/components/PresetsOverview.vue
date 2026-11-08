<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ presets.length }} {{ noun }} presets
    p {{ inSongsCount }} of them have Instances in a song. The other {{ presets.length - inSongsCount }} are not in any song.

    div(class="flex")
      HCard(class="max-w-md md:flex-1" :subtitle="leaderboardSubtitle")
        template(#title) Leaderboard
        div(class="divide-y divide-gray-200")
          div(v-for="{ preset, songs } in leaderboard" :key="preset.path" class="py-2")
            span {{ songs }} - 
            RouterLink(:to="preset.url") {{ preset.name.split('.')[0] }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { ParsedKitFile, ParsedSoundFile } from '../composables/useFileStore'
import { isPresetInAnySong, songsDerivedFromPreset } from '../deluge/usage'

const props = defineProps<{
  presets: (ParsedSoundFile | ParsedKitFile)[]
  noun: string
  leaderboardSubtitle: string
}>()

const inSongsCount = computed(() => props.presets.filter(isPresetInAnySong).length)

const leaderboard = computed(() => props.presets
  .map(preset => ({ preset, songs: songsDerivedFromPreset(preset).length }))
  .filter(entry => entry.songs > 0)
  .sort((a, b) => b.songs - a.songs)
  .slice(0, 20))
</script>
