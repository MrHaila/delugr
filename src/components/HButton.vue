<template lang="pug">
button(
  type="button"
  :class="['focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex justify-center items-center border border-transparent font-medium shadow-sm select-none text-white', variantClasses, sizeClasses]"
  )
  slot Button TBD
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: string
  size?: 'xs' | 'md'
}>(), {
  variant: 'primary',
  size: 'md'
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-gray-500 hover:bg-gray-700 focus:ring-gray-500'
    case 'warning':
      return 'bg-yellow-500 hover:bg-yellow-700 focus:ring-yellow-500'
    case 'danger':
      return 'bg-red-500 hover:bg-red-700 focus:ring-red-500'
    default:
      return 'bg-cyan-500 hover:bg-cyan-700 focus:ring-cyan-500'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-xs px-1 py-0.5 rounded-sm'
    default:
      return 'text-sm px-4 py-2 rounded-md'
  }
})
</script>