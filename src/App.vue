<template lang="pug">
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

div(v-else).flex
  nav(aria-label="Sidebar").flex-shrink-0.bg-gray-800
    div.w-20.p-3.space-y-3
      sidebar-link(variant="songs")
      sidebar-link(variant="synths")
      sidebar-link(variant="kits")
      sidebar-link(variant="samples")

  main.min-w-0.flex-1.flex
    aside.shrink-0.border-r.border-gray-200.bg-gray-100.w-72.divide-y.divide-gray-200
      //- List bar
      h1.pl-3.py-2.font-bold Songs #[span.text-gray-600.font-normal.text-xs.bg-gray-400.text-white.rounded(class="py-0.5 px-1 ml-0.5") {{ store.songs ? Object.keys(store.songs.files).length : 0 }}]
      router-link(
        v-if="store.songs" :to="'/songs/' + key"
        v-for="(file, key) in store.songs.files"
        :key="key"
        :class="['flex justify-between p-3 cursor-pointer text-sm', route.path.includes(String(key)) ? 'bg-amber-400' : 'hover:bg-gray-300']"
      )
        dt(class="font-medium text-gray-900") {{ key }}
        dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(file.fsFile.lastModified).toFormat('yyyy-MM-dd') }}
        
    section(aria-labelledby="primary-heading").min-w-0.flex-1.h-full.flex.flex-col.overflow-y-auto
      router-view
  
</template>

<script lang="ts" setup>
import Logo from './components/Logo.vue'
import SidebarLink from './components/SidebarLink.vue'
import { ref, computed, reactive } from 'vue'
import { useStore } from './store'
import { DateTime } from 'luxon'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = useStore()

const parser = new DOMParser()

interface Instrument {
  tag: string,
  presetSlot: number,
  presetName: string
}

interface Song {
  fsFile: File,
  document: Document,
  parsedSong: {
    name: string,
    firmwareVersion: string,
    earliestCompatibleFirmware: string,
    instruments: Instrument[],
  }
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
        const files: { [key: string]: Song } = {}
        for await (const song of entry.values()) {
          if (song.kind === 'file') {
            // Parse song file
            const fsFile = await song.getFile()
            if (!fsFile || fsFile.type !== 'text/xml') return

            const name = fsFile.name.slice(0, -4)
            const xml = await fsFile.text()
            const document = parser.parseFromString(xml, "text/xml")
            const xmlInstruments = document.querySelector('song > instuments')?.children
            let instruments: Instrument[] = []

            if (xmlInstruments) {
              instruments = Array.from(xmlInstruments).map(i => {
                return {
                  tag: i.tagName,
                  presetSlot: Number(i.hasAttribute('presetSlot')),
                  presetName: String(i.getAttribute('presetName')),
                  //polyphonic: i.getAttribute('polyphonic'),
                  //attributes: Array.from(i.attributes).map(a => `${a.name}: ${a.value}`)
                }
              })
            }

            files[name] = {
              fsFile,
              document,
              parsedSong: {
                name,
                firmwareVersion: String(document.querySelector('song')?.getAttribute('firmwareVersion')),
                earliestCompatibleFirmware: String(document.querySelector('song')?.getAttribute('earliestCompatibleFirmware')),
                instruments
              }
            }
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