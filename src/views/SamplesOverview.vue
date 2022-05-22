<template lang="pug">
section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") ⬅ Select a sample to get started
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])
</script>