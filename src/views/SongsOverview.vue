<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="space-y-3")
    h1.font-bold.text-2xl You have {{ store.songs.length }} songs

  div(class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") ⬅ Select a song to get started
</template>

<script lang="ts" setup>
import { useFiles } from '../deluge/files'

const store = useFiles()

const props = defineProps([
  'name'
])
</script>