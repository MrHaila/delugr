<template lang="pug">
div.min-h-full
  div.sticky.top-0.space-x-1.border-b.border-neutral-400.border-opacity-40.flex.items-stretch.items-center.h-10.shadow-lg.bg-gradient-to-b.from-neutral-200.to-neutral-300(class="dark:bg-neutral-700 dark:from-neutral-600 dark:to-neutral-700 dark:border-neutral-600 dark:border-opacity-40 z-50 md:px-5 justify-center md:justify-start")
    div.fill-current(class="hidden md:flex items-center")
      a(href="https://haila.fi" target="_blank").h-4
        logo
    div.font-semibold.px-3.flex.items-center(class="hidden md:flex")
      div Delugr
    div(class="pt-2") {{ folderName }}

  div.container.mx-auto.px-4.my-8
    div(v-if="folderName === undefined")
      h1 Select the Deluge memory card root folder to get started.
      h-button(@click="getFolder") Select folder

    div(v-else)
      h-card
        template(#title) Songs
        dl(v-if="dFolders.songs" class="sm:divide-y sm:divide-gray-200")
          div(v-for="file in dFolders.songs.files" :key="file.name" class="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6")
            dt(class="text-sm font-medium text-gray-900") {{ file.name.slice(0, -4) }}
            dd(class="mt-1 text-sm text-gray-500 sm:mt-0 sm:col-span-2") {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
        div(v-else) No content

</template>

<script lang="ts" setup>
import Logo from './components/Logo.vue'
import HButton from './components/HButton.vue'
import HCard from './components/HCard.vue'
import { ref, computed, reactive } from 'vue'
import { DateTime } from 'luxon'

interface DelugeFolders {
  songs: {
    handle: FileSystemDirectoryHandle,
    files: File[]
  } | null
}

const folderName = ref<string>()
const dFolders: DelugeFolders = reactive({
  songs: null
})

async function getFolder() {
  // Ask for a folder
  const root = await window.showDirectoryPicker()

  folderName.value = root.name

  // Check for content
  for await (const entry of root.values()) {
    if (entry.kind === 'file') return

    switch (entry.name.toUpperCase()) {
      case 'SONGS':
        // List all song files
        let files = []
        for await (const song of entry.values()) {
          if (song.kind === 'file') {
            const file = await song.getFile()
            files.push(file)
          }
        }
        dFolders.songs = { handle: entry as FileSystemDirectoryHandle, files }
        break
    
      default:
        console.log('Unknown folder: ' + entry.name)
        break
    }
  }
}
</script>