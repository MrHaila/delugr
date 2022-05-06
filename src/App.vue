<template lang="pug">
div(v-if="!store.folderName").text-center.mt-20.space-y-3
  h1 Select the Deluge memory card root folder to get started.
  h-button(@click="getFolder") Select folder

div(v-else class="flex h-screen overflow-hidden")
  nav(aria-label="Sidebar" class="flex-shrink-0 bg-gray-800 flex flex-col justify-between text-gray-400")
    div(class="space-y-3 py-3")
      div(class="flex justify-center font-bold")
        router-link(to="/" class="hover:text-gray-50") Delugr

      div.w-20.p-3.space-y-3
        sidebar-link(variant="songs")
        sidebar-link(variant="synths")
        sidebar-link(variant="kits")
        sidebar-link(variant="samples")

      div(class="flex justify-center")
        RefreshIcon(aria-hidden="true" @click="parseFolder(store.folderHandle, store.folderName)" class="border border-gray-700 h-7 w-7 p-1 text-gray-400 hover:bg-gray-700 rounded")

    div(class="flex justify-center")
      a(href="https://haila.fi" target="_blank" class="h-4 mb-4 fill-current text-gray-400 hover:text-gray-50")
        h-logo

  router-view

</template>

<script lang="ts" setup>
import HLogo from './components/HLogo.vue'
import SidebarLink from './components/SidebarLink.vue'
import { useRoute } from 'vue-router'
import { RefreshIcon } from '@heroicons/vue/solid'
import { parseFolder, useStore } from './deluge/files'

const route = useRoute()
const store = useStore()

let rootFolder: FileSystemDirectoryHandle | null = null

async function getFolder() {
  // Ask for a folder
  rootFolder = await window.showDirectoryPicker()
  store.folderName = rootFolder.name
  store.folderHandle = rootFolder
  parseFolder(rootFolder, rootFolder.name)
}
</script>