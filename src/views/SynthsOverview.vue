<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.sounds.length }} synths
    p {{ usedSynthsCount }} of them are currently in use in a song or a kit. That means {{ store.sounds.length - usedSynthsCount }} are not used at all.

    div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard
        div(class="divide-y divide-gray-200")
          div(v-for="sound in Object.values(store.sounds).sort((a, b) => b.usage.total - a.usage.total).slice(0, 19).filter(sound => sound.usage.total > 0)" :key="sound.path" class="py-2")
            span {{ sound.usage.total }} - 
            router-link(:to="'/synths/' + sound.name.split('.')[0]") {{ sound.name.split('.')[0] }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useFiles } from '../deluge/files'

const store = useFiles()

const usedSynthsCount = computed(() => {
  return store.sounds.map(s => s.usage.total).reduce((a, b) => a + b, 0)
})
</script>