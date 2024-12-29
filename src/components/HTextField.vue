<template lang="pug">
div
  label(for="email" class="block text-sm font-medium") {{ label }}

  div(class="mt-1 relative rounded-md shadow-sm")
    input(class="block w-full pr-10 focus:outline-none sm:text-sm rounded-md" v-model="internalValue" type="text")
    div(class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none")
      ExclamationCircleIcon(class="h-5 w-5 text-red-500" aria-hidden="true")

  p(class="mt-1 text-xs text-gray-500" id="email-error") {{ hint }}
</template>

<script lang="ts" setup>
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'
import { ref, watch } from 'vue';

const props = defineProps<{
  label: string
  modelValue: string
  hint: string
}>()

const internalValue = ref(props.modelValue)

watch(() => props.modelValue, (value) => {
  internalValue.value = value
}, { immediate: true })

watch(internalValue, (value, oldValue) => {
  if (value === oldValue) return
  emit('update:modelValue', value)
})

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

/*
  TODO:
  - Dynamic labels
  - Validation
  - Error messages
  - v-model
*/

</script>
