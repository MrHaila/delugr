<template lang="pug">
//- Landing page
div(v-if="!store.parsed" class="mt-20 space-y-20")
  div(class="text-center")
    h1(class="text-8xl font-bold mb-5") Delurg
    h2(class="text-2xl") The Synthstrom Deluge file browser... in the browser!

  div(class="space-y-20")
    div(class="flex justify-center text-center")
      div(class="p-8 rounded-xl border-dashed border-gray-400 border-4" style="width: 32rem; height: 9.7rem")
        div(v-if="!store.folderName")
          p(class="mb-5") Select the Deluge memory card root folder to get started.
          h-button(@click="getFolder") Select folder
        div(v-else class="text-center space-y-3")
          h1(class="mb-6") Parsing the folder contents...
          p(class="text-xl font-bold") {{ store.filesScanned }} files scanned

    div(class="flex justify-center")
      div(class="bg-gray-200 rounded p-5 space-y-3" style="width: 42rem")
        h3(class="font-bold") 👋 Greetings, stranger!
        p Delugr is a web-app that lets you browse the contents of your Deluge memory card.
        p It uses the new #[a(href="https://web.dev/file-system-access/") File System Access API] to read the contents of your memory card, so there's no need to install anything! As of May 2022, the API is not yet supported by Firefox, Safari or any of the mobile browsers.
        p Made with ❤️ by #[a(href="https://haila.fi") Teemu Haila] as #[a(href="https://gitlab.com/dasinf/delugr") open source]. Contributions welcome!

//- Error
div(v-else-if="!store.parsed && store.parseError" class="text-center mt-20 space-y-3")
  h1 Something went wrong while parsing the folder. Maybe there's something helpful in the browser logs?
  h-button(@click="getFolder") Try again

//- Actual thing
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

      //div(class="flex justify-center")
        RefreshIcon(aria-hidden="true" @click="getFolder" class="border border-gray-700 h-7 w-7 p-1 text-gray-400 hover:bg-gray-700 rounded")

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
  // TODO: handle cancels and other such errors
  rootFolder = await window.showDirectoryPicker()
  store.folderName = rootFolder.name
  store.folderHandle = rootFolder
  parseFolder(rootFolder, '/', true)
}
</script>