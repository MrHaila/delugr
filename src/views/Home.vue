<template lang="pug">
div(class="space-y-5 p-3 overflow-y-auto w-full")
  div(class="max-w-3xl space-y-3")
    h1(class="font-bold text-4xl") Overview
    p Alright, so we got the folder parsed. Here's what we know so far.

    div
      p Songs: {{ fileStore.songs.length }}
      p Synths: {{ fileStore.sounds.length }}
      p Kits: {{ fileStore.kits.length }}
      p Samples: {{ fileStore.samples.length }}

  div(class="flex space-x-3")
    //HCard(
      title="Folders"
      class="max-w-3xl flex-1"
      )
      pre {{ folders }}

    HCard(
      title="Nerdy Details"
      class="max-w-3xl flex-1"
      )
      div(class="space-y-3")
        p The Deluge has three types of entities: songs, kits and synths (internally called 'sounds'). Synths and kits can be saved as presets, but when used, they are duplicated and saved as a part of the song or kit to allow for local modifications. This makes them a bit tricky to keep track of.
        
        p(class="text-gray-400") There are sure to be obvious bugs and missing stuff. Feel free to report them in the repo and maybe even help out by leaving a PR!
        p(class="text-gray-400") P.S. I don't have any firmware v1 or v2 songs to test with. Send me one if you have one!

    HListCard(
      title="Skipped Files"
      :items="fileStore.skippedFiles"
      class="max-w-3xl flex-1"
      )
      template(#item="{ item }")
        div(class="flex space-x-3 justify-between")
          div(class="text-red-800") {{ item.name }}
          HButton(
            size="xs"
            variant="danger"
            @click="openFileDeletionModal(item.fileHandle)"
            class="h-6"
            )
            TrashIcon(
              class="h-3"
              )
        div(class="text-gray-400") {{ item.reason }}

FileDeletionModal(
  v-if="selectedFileForDeletion"
  :file-handle="selectedFileForDeletion"
  ref="fileDeletionModal"
  )
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue'
import { useFileStore } from '../composables/useFileStore'
import { TrashIcon } from '@heroicons/vue/20/solid'
import FileDeletionModal from '../components/FileDeletionModal.vue'

const { fileStore } = useFileStore()

// Async function to list all folders in the folderHandle
const listFolders = async () => {
  if (!fileStore.folderHandle) return

  const entries = await fileStore.folderHandle.keys()
  const folders: string[] = []

  for await (const entry of entries) {
    // if (entry.kind === 'directory') {
    //   folders.push(entry.name)
    // }
    folders.push(entry)
  }

  return folders
}

const folders = ref<string[]>()
onMounted(async () => {
  folders.value = await listFolders()
})

const selectedFileForDeletion = ref<FileSystemFileHandle>()
const fileDeletionModal = ref<typeof FileDeletionModal>()

async function openFileDeletionModal (fileHandle: FileSystemFileHandle) {
  selectedFileForDeletion.value = fileHandle
  if (!fileDeletionModal.value) await nextTick() // Await for the next tick to make sure the modal is mounted before opening it.
  fileDeletionModal.value?.openModal()
}

</script>