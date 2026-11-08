// Fork of https://github.com/vueuse/vueuse/blob/main/packages/core/useDropZone/index.ts

import { ref } from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export function useDragAndDrop(target: Ref<HTMLElement | null | undefined>, onDrop: (items: DataTransferItemList | null) => void,) {
  const isOverDropZone = ref(false)
  let counter = 0

  useEventListener<DragEvent>(target, 'dragenter', (event) => {
    event.preventDefault()
    counter += 1
    isOverDropZone.value = true
  })
  useEventListener<DragEvent>(target, 'dragover', (event) => {
    event.preventDefault()
  })
  useEventListener<DragEvent>(target, 'dragleave', (event) => {
    event.preventDefault()
    counter -= 1
    if (counter === 0)
      isOverDropZone.value = false
  })
  useEventListener<DragEvent>(target, 'drop', (event) => {
    event.preventDefault()
    counter = 0
    isOverDropZone.value = false
    onDrop(event.dataTransfer?.items ?? null)
  })

  return {
    isOverDropZone,
  }
}