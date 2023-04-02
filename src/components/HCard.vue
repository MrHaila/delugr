<template lang="pug">
div(class="bg-white shadow overflow-hidden sm:rounded-lg")
  //- Header
  div(class="px-5 py-4")
    h3(class="text-lg leading-6 font-semibold text-gray-900")
      slot(name="title") {{ title || 'Placeholder Title' }}
      p(v-if="$slots.subtitle || subtitle" class="mt-1 max-w-2xl text-sm font-normal text-gray-500")
        slot(name="subtitle") {{ subtitle }}
  
  //- Body
  div(:class="['border-t border-gray-200 px-5', props.flush ? '' : 'py-3']")
    slot
      div [EMPTY]
</template>

<script lang="ts" setup>
const props = defineProps<{
  title?: string
  subtitle?: string
  flush?: boolean
}>()
</script>