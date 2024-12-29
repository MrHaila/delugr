<template lang="pug">
section(ria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ fileStore.kits.length }} kits
    p {{ usedKitsCount }} of them are currently in use in a song. That means {{ fileStore.kits.length - usedKitsCount }} are not used at all.
  
    div(class="flex")
      HCard(class="max-w-md md:flex-1")
        template(#title) Leaderboard
        div(class="divide-y divide-gray-200")
          div(v-for="kit in Object.values(fileStore.kits).sort((a, b) => b.usage.getTotal() - a.usage.getTotal()).slice(0, 19).filter(kit => kit.usage.getTotal() > 0)" :key="kit.path" class="py-2")
            span {{ kit.usage.getTotal() }} - 
            RouterLink(:to="'/kits/' + kit.name.split('.')[0]") {{ kit.name.split('.')[0] }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useFileStore } from '../composables/useFileStore'

const { fileStore } = useFileStore()

const usedKitsCount = computed(() => {
  return fileStore.kits.map(s => s.usage.getTotal()).reduce((a, b) => a + b, 0)
})
</script>