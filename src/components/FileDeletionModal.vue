<template lang="pug">
HModal(
  ref="modal"
  title="Delete File"
  okButtonLabel="Delete"
  :onOk="deleteFile"
  )
  p(v-if="!file") Loading...
  div(v-else)
    p(class="mb-1") You are about to delete #[HBadge(inline variant="warning") {{ file }}].
    p(class="text-sm text-gray-500") This action cannot be undone. All good?
    //- div(class="bg-gray-200 text-gray-600 rounded-sm p-3 border")
      p {{ file.name }}
      p {{ file.size }} bytes
      p {{ file.lastModified }}
      p {{ file.webkitRelativePath }}
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import HModal from './HModal.vue'

const props = defineProps<{
  fileHandle: FileSystemFileHandle
}>()

const file = ref<string>()

watch(() => props.fileHandle, async () => {
  file.value = await props.fileHandle.name
}, { immediate: true })

const modal = ref<typeof HModal>()

async function deleteFile() {
  await new Promise(resolve => setTimeout(resolve, 3000))
}

defineExpose({
  openModal: () => modal.value?.openModal(),
})
</script>