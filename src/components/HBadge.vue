<template lang="pug">
span(:class="['py-0.5 px-1 ml-0.5 font-normal text-xs rounded align-middle', { 'relative bottom-0.5': inline }, variantClass]")
  slot
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'neutral' | 'warning' | 'danger'
  inline?: boolean
}>(), {
  variant: 'neutral',
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'neutral':
      return 'bg-gray-400 text-white'
    case 'warning':
      return 'bg-yellow-500 text-white'
    case 'danger':
      return 'bg-red-400 text-white'
  }
})
</script>