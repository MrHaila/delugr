<template lang="pug">
HModal(

)
  p(v-if="!file") Loading...
  div(v-else)
    p You are about to delete {{ file.name }}. This action cannot be undone.
    div(class="bg-gray-200 text-gray-600 rounded-sm p-3 border")
      p {{ file.name }}
      p {{ file.size }} bytes
      p {{ file.lastModified }}
      p {{ file.webkitRelativePath }}
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import HModal from './HModal.vue'

const props = defineProps<{
  fileHandle: FileSystemFileHandle
}>()

const file = ref<File>()

onMounted(async () => {
  file.value = await props.fileHandle.getFile()
})

defineExpose({
  openModal: HModal.openModal,
  closeModal: HModal.closeModal,
})
</script>