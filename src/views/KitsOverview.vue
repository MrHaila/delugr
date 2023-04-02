<template lang="pug">
section(ria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.kits.length }} kits
    p {{ usedKitsCount }} of them are currently in use in a song. That means {{ store.kits.length - usedKitsCount }} are not used at all.
  
    div(class="flex")
      h-card(class="max-w-md md:flex-1")
        template(#title) Leaderboard
        div(class="divide-y divide-gray-200")
          div(v-for="kit in Object.values(store.kits).sort((a, b) => b.usage.total - a.usage.total).slice(0, 19).filter(kit => kit.usage.total > 0)" :key="kit.path" class="py-2")
            span {{ kit.usage.total }} - 
            router-link(:to="'/kits/' + kit.name.split('.')[0]") {{ kit.name.split('.')[0] }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useFiles } from '../deluge/files'

const store = useFiles()

const usedKitsCount = computed(() => {
  return store.kits.map(s => s.usage.total).reduce((a, b) => a + b, 0)
})
</script>