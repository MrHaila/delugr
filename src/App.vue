<template lang="pug">
div.h-full.flex.flex-col
  header.space-x-1.border-b.border-neutral-400.border-opacity-40.flex.items-stretch.items-center.h-10.shadow-lg.bg-gradient-to-b.from-neutral-200.to-neutral-300(class="dark:bg-neutral-700 dark:from-neutral-600 dark:to-neutral-700 dark:border-neutral-600 dark:border-opacity-40 md:px-5 justify-center md:justify-start")
    div.fill-current(class="hidden md:flex items-center")
      a(href="https://haila.fi" target="_blank").h-4
        logo
    div.font-semibold.px-3.flex.items-center(class="hidden md:flex")
      div Delugr
    div(class="pt-2") {{ store.folderName }}

  div(v-if="!store.folderName").text-center.mt-20.space-y-3
    h1 Select the Deluge memory card root folder to get started.
    h-button(@click="getFolder") Select folder

  div(v-else).min-h-0.flex-1.flex.overflow-hidden
    nav(aria-label="Sidebar").flex-shrink-0.bg-gray-800.overflow-y-auto
      div.relative.w-20.flex.flex-col.p-3.space-y-3
        sidebar-link(variant="songs")
        sidebar-link(variant="synths")
        sidebar-link(variant="kits")
        sidebar-link(variant="samples")

    main.min-w-0.flex-1.border-t.border-gray-200.flex
      aside.flex-shrink-0
        div.h-full.relative.flex.flex-col.w-72.border-r.border-gray-200.bg-gray-100.overflow-y-auto
          //- List bar
          h1.pl-3.py-2.font-bold.border-b Songs
          div.divide-y.divide-gray-200(v-if="store.songs")
            router-link(:to="'/songs/' + file.name.slice(0, -4)" v-for="file in store.songs.files" :key="file.name")
              div(:class="['flex justify-between p-3 cursor-pointer hover:bg-gray-300 text-sm', route.path.includes(file.name.slice(0, -4)) ? 'bg-gray-200' : '']")
                dt(class="font-medium text-gray-900") {{ file.name.slice(0, -4) }}
                dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
          

      section(aria-labelledby="primary-heading").min-w-0.flex-1.h-full.flex.flex-col.overflow-y-auto
        router-view
    
</template>

<script lang="ts" setup>
import Logo from './components/Logo.vue'
import HButton from './components/HButton.vue'
import HCard from './components/HCard.vue'
import SidebarLink from './components/SidebarLink.vue'
import { ref, computed, reactive } from 'vue'
import { useStore } from './store'
import { DateTime } from 'luxon'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = useStore()

function isRouteActive(test: string) {
  return route.path.includes(test)
}

async function getFolder() {
  // Ask for a folder
  const root = await window.showDirectoryPicker()

  store.folderName = root.name

  // Check for content
  for await (const entry of root.values()) {
    // Skip evaluating files
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

        // Save to store
        store.songs = {
          fsHandle: entry as FileSystemDirectoryHandle,
          files
        }
        break
    
      default:
        console.log('Unknown folder: ' + entry.name)
        break
    }
  }
}
</script>