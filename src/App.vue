<template lang="pug">
div(v-if="!store.folderName").text-center.mt-20.space-y-3
  h1 Select the Deluge memory card root folder to get started.
  h-button(@click="getFolder") Select folder

div(v-else class="flex h-screen overflow-hidden")
  nav(aria-label="Sidebar" class="flex-shrink-0 bg-gray-800 flex flex-col justify-between text-gray-400")
    div(class="space-y-3 py-3")
      div(class="flex justify-center font-bold") Delugr

      div.w-20.p-3.space-y-3
        sidebar-link(variant="songs")
        sidebar-link(variant="synths")
        sidebar-link(variant="kits")
        sidebar-link(variant="samples")

    div(class="fill-current flex justify-center")
      a(href="https://haila.fi" target="_blank" class="h-4 mb-4")
        logo

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
  presetSlot: number | null,
  presetName: string | null,
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
            const xmlInstruments = document.querySelector('song > instruments')?.children
            let instruments: Instrument[] = []

            if (xmlInstruments) {
              instruments = Array.from(xmlInstruments).map(i => {
                return {
                  tag: i.tagName,
                  presetSlot: i.hasAttribute('presetSlot') ? Number(i.getAttribute('presetSlot')) : null,
                  presetName: i.getAttribute('presetName'),
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