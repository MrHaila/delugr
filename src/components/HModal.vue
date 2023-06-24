<template lang="pug">
dialog(
  ref="dialogElement"
  class="rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl sm:my-8 sm:max-w-lg sm:w-full sm:p-6"
  )
  div(class="sm:flex sm:items-start")
    div(
      v-if="variant === 'warning'"
      class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10"
      )
      ExclamationTriangleIcon(class="h-6 w-6 text-yellow-600" aria-hidden="true")
    div(
      v-else-if="variant === 'danger'"
      class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
      )
      ExclamationTriangleIcon(class="h-6 w-6 text-red-600" aria-hidden="true")

    div(class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left")
      DialogTitle(as="h3" class="text-lg leading-6 font-medium text-gray-900")
        slot(name="title") {{ title || 'Title TBD' }}
      div(v-if="message" class="mt-2")
        p(class="text-sm text-gray-500") {{ message }}
      div(class="mt-2")
        slot
      
  div(class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense")
    h-button(
      variant="secondary"
      @click="cancel"
      ) Cancel
    h-button(
      :variant="variant"
      @click="ok"
      ) {{ okButtonLabel }}   
</template>

<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount, ref } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const dialogElement = ref<HTMLDialogElement>()

// Visibility controls
const open = ref(false)
function openModal() {
  open.value = true
  dialogElement.value?.showModal()
}
function closeModal() {
  open.value = false
  dialogElement.value?.close()
}
defineExpose({
  openModal,
  closeModal,
})

// Events
const emit = defineEmits(['ok', 'cancel', 'show', 'hide'])
onBeforeMount(() => {
  emit('show')
})
onBeforeUnmount(() => {
  emit('hide')
})

// Variants etc.
const props = withDefaults(defineProps<{
  variant?: 'warning' | 'danger'
  title?: string
  message?: string
  okButtonLabel?: string
}>(), {
  variant: 'warning',
  title: 'Title TBD',
  message: undefined,
  okButtonLabel: 'Ok',
})

// Actions
function ok() {
  emit('ok')
  closeModal()
}

function cancel() {
  emit('cancel')
  closeModal()
}
</script>

<style>
dialog::backdrop {
  background: rgba(107, 114, 128, 0.45);
  backdrop-filter: blur(6px);
  transition: all;
}
</style>
