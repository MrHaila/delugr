<template lang="pug">
HModal(
  ref="modal"
  title="Delete File"
  okButtonLabel="Delete"
  :onOk="deleteFile"
  variant="danger"
  )
  p(v-if="!file") Loading...
  div(v-else)
    p(class="mb-1") You are about to delete #[HBadge(inline variant="danger") {{ file }}].
    p(class="text-sm text-gray-500") This action cannot be undone. All good?
    p(class="mt-2 text-sm text-gray-500") Note: As of December 2024, the #[a(href="https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/remove" target="blank") API for removing files] is not yet implemented in #[a(href="https://caniuse.com/mdn-api_filesystemhandle_remove" target="blank") all browsers].
    //- div(class="bg-gray-200 text-gray-600 rounded-sm p-3 border")
      p {{ file.name }}
      p {{ file.size }} bytes
      p {{ file.lastModified }}
      p {{ file.webkitRelativePath }}
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import HModal from './HModal.vue'
import { useFiles } from '../deluge/files'

const props = defineProps<{
  fileHandle: FileSystemFileHandle
}>()

const file = ref<string>()

watch(() => props.fileHandle, async () => {
  file.value = await props.fileHandle.name
}, { immediate: true })

const modal = ref<typeof HModal>()

const store = useFiles()

async function deleteFile() {
  try {
    // @ts-expect-error - TS doesn't know about remove() as of June 2023.
    await props.fileHandle.remove()
  } catch (error) {
    const err = error as DOMException

    // Allow permission lock errors to be ignored as the files seem to get deleted regardless?
    if (err.name !== 'NoModificationAllowedError') {
      throw error
    } else {
      // Remove from the list of skipped files.
      store.skippedFiles = store.skippedFiles.filter(f => f.fileHandle !== props.fileHandle)
    }
  }
}

defineExpose({
  openModal: () => modal.value?.openModal(),
})
</script>