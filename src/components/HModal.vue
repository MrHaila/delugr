<template lang="pug">
TransitionRoot(as="template" :show="open")
  Dialog(as="div" class="relative z-10" @close="closeModal")
    TransitionChild(as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0")
      div(class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity")

    div(class="fixed z-10 inset-0 overflow-y-auto")
      div(class="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0")
        TransitionChild(as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95")
          DialogPanel(class="relative bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6")
            div(class="sm:flex sm:items-start")
                div(
                  v-if="variant === 'warning'"
                  class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10"
                  )
                  ExclamationIcon(class="h-6 w-6 text-yellow-600" aria-hidden="true")
                div(
                  v-else-if="variant === 'danger'"
                  class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
                  )
                  ExclamationIcon(class="h-6 w-6 text-red-600" aria-hidden="true")

                div(class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left")
                  DialogTitle(as="h3" class="text-lg leading-6 font-medium text-gray-900")
                    slot(name="title") Placeholder Title
                  div(class="mt-2")
                    p(class="text-sm text-gray-500")
                      slot(name="message") Lorem ipsum dolor sit amet.
                  div(class="mt-2")
                    slot
                
            div(class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense")
              h-button(
                variant="secondary"
                @click="closeModal"
                ref="cancelButtonRef"
                ) Cancel
              h-button(
                :variant="variant"
                @click="ok"
                ) {{ okLabel }}   
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { CheckIcon, ExclamationIcon } from '@heroicons/vue/outline'

// Visibility controls
const open = ref(false)
function openModal() {
  open.value = true
}
function closeModal() {
  open.value = false
}
defineExpose({
  openModal,
  closeModal,
})

// Events
const emit = defineEmits(['ok'])
function ok() {
  emit('ok')
  closeModal()
}

// Variants etc.
interface Props {
  variant: 'warning' | 'danger'
  okLabel: string
}
const props = defineProps<Props>()
</script>