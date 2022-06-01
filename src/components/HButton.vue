<template lang="pug">
button(
  type="button"
  :class="['focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm select-none text-white', getVariantClass()]"
  )
  slot Button text
</template>

<script lang="ts" setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary'
  },
})

function getVariantClass() {
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
}
</script>