<template lang="pug">
dialog(
  ref="dialogElement"
  class="rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl sm:my-8 sm:max-w-lg sm:w-full sm:p-6 transition-transform"
  )
  //- Ok pressed -> waiting...
  div(v-if="okPromisePending")
    div(class="flex justify-center my-14 italic text-gray-500") Doing the thing...
    div(v-if="okPromiseError")
      div(class="flex justify-center text-red-500") Error: {{ okPromiseError.message }}
      h-button(
        @click="closeModal"
        variant="danger"
        class="mt-4 w-full"
        ) Close


  //- Default content
  div(v-else)
    div(class="sm:flex sm:items-start")
      div(
        v-if="variant === 'warning'"
        class="mb-3 hidden mx-auto flex-shrink-0 sm:flex items-center justify-center h-12 w-12 rounded-full bg-yellow-200 sm:mx-0 sm:h-10 sm:w-10"
        )
        ExclamationTriangleIcon(class="h-6 w-6 text-yellow-600" aria-hidden="true")
      div(
        v-else-if="variant === 'danger'"
        class="mb-3 hidden mx-auto flex-shrink-0 sm:flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
        )
        ExclamationTriangleIcon(class="h-6 w-6 text-red-600" aria-hidden="true")

      div(class="sm:mt-0 sm:ml-4 text-left")
        h3(class="text-lg leading-6 font-medium text-gray-900")
          slot(name="title") {{ title || 'Title TBD' }}
        div(v-if="message" class="mt-2")
          p(class="text-sm text-gray-500") {{ message }}
        div(class="mt-2")
          slot
        
    div(class="mt-7 sm:mt-8 grid grid-rows-2 sm:grid-rows-1 sm:grid-cols-2 gap-3 sm:grid-flow-row-dense")
      h-button(
        :variant="variant"
        @click="ok"
        ) {{ okButtonLabel }}   
      h-button(
        class="order-first"
        variant="secondary"
        @click="cancel"
        ) Cancel
</template>

<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount, ref } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(defineProps<{
  variant?: 'warning' | 'danger'
  title?: string
  message?: string
  okButtonLabel?: string
  onOk?: () => Promise<void>
}>(), {
  variant: 'warning',
  title: 'Title TBD',
  okButtonLabel: 'Ok',
})

const dialogElement = ref<HTMLDialogElement>()

// Visibility controls
const open = ref(false)
function openModal() {
  open.value = true
  okPromisePending.value = false
  dialogElement.value?.showModal()
}
function closeModal() {
  open.value = false
  okPromisePending.value = false
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

// Actions
const okPromisePending = ref(false)
const okPromiseError = ref<Error>()
async function ok() {
  emit('ok')
  if (props.onOk) {
    okPromisePending.value = true
    try {
      await props.onOk()
      closeModal()
    } catch (error) {
      okPromiseError.value = error as Error
      console.error(error)
    }
  }
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
