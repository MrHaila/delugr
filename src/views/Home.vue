<template lang="pug">
div(class="space-y-5 p-3 overflow-y-auto w-full")
  div(class="max-w-3xl space-y-3")
    h1(class="font-bold text-4xl") Overview
    p Alright, so we got the folder parsed. Here's what we know so far.

    div
      p Songs: {{ store.songs.length }}
      p Synths: {{ store.sounds.length }}
      p Kits: {{ store.kits.length }}
      p Samples: {{ store.samples.length }}

    p The Deluge has three types of entities: songs, kits and synths (internally called 'sounds'). Synths and kits can be saved as presets. Songs and kits actually contain full instances (modified copies) of the original preset instead of just a reference to the used preset.
    
    p(class="text-gray-400") There are sure to be obvious bugs and missing stuff. Feel free to report them in the repo and maybe even help out by leaving a PR!
    p(class="text-gray-400") P.S. I don't have any firmware v1 or v2 songs to test with. Send me one if you have one!

  div(class="flex space-x-3")
    //HCard(
      title="Folders"
      class="max-w-3xl flex-1"
      )
      pre {{ folders }}

    HListCard(
      title="Skipped Files"
      :items="store.skippedFiles"
      class="max-w-3xl flex-1"
      )
      template(#item="{ item }")
        div(class="flex space-x-3 justify-between")
          div(class="text-red-800") {{ item.name }}
          HButton(
            size="xs"
            variant="danger"
            @click="selectedFileForDeletion = item.fileHandle"
            )
            TrashIcon(
              class="h-3"
              )
        div(class="text-gray-400") {{ item.reason }}

FileDeletionModal(
  v-if="selectedFileForDeletion"
  :file-handle="selectedFileForDeletion"
  )
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useFiles } from '../deluge/files'
import { TrashIcon } from '@heroicons/vue/20/solid'
import FileDeletionModal from '../components/FileDeletionModal.vue'

const store = useFiles()

// Async function to list all folders in the folderHandle
const listFolders = async () => {
  if (!store.folderHandle) return

  const entries = await store.folderHandle.keys()
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
</script>