<template lang="pug">
button(type="button" class="focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm select-none text-white" :class="{ 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500': true }")
  slot Button text
</template>

<script lang="ts" setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary'
  },
})
</script>