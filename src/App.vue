<template lang="pug">
//- Landing page
div(v-if="store.parseError || !store.parsed" class="pt-20 space-y-20 h-screen overflow-y-auto")
  //- Header
  div(class="text-center")
    h1(class="text-8xl font-bold mb-5 text-gray-900") Delugr
    h2(class="text-2xl text-gray-900 font-semibold") The Synthstrom Deluge file browser... in the browser!

  //- File selector UI
  div(class="space-y-20")
    div(class="flex justify-center text-center")
      div(
        :class="['p-8 rounded-xl border-dashed border-gray-400 bg-sky-50/50 backdrop-blur-md border-4 h-44 flex flex-col justify-center', { 'border-sky-500 bg-sky-100/50': isOverDropZone, 'border-red-300 bg-red-50/50': store.parseError && !isOverDropZone }]"
        style="width: 32rem"
        ref="dropzone"
        )
        //- Parsing
        div(v-if="isParsing")
          h1(class="mb-6") {{ store.parsingMessage }}
          p(class="text-xl font-bold") {{ store.filesScanned }} files scanned

        //- Drag and drop
        div(
          v-else-if="isOverDropZone"
          class="text-gray-500"
          ) ...aaaand drop!

        //- Error
        div(v-else-if="store.parseError" class="space-y-3")
          h1(class="text-lg font-bold text-red-900") Something went wrong while parsing the folder 😱
          p(class="text-red-800") {{ store.parseError }}
          h-button(@click="askAndParseFolder") Pick another folder


        //- Default content
        div(v-else class="text-center space-y-5")
          div(class="space-y-1")
            p Select the Deluge memory card root folder to get started.
            p(class="text-gray-500 text-sm italic") {{ dragAndDropMessage }}
          div(class="flex justify-center space-x-3")
            h-button(
              v-if="store.folderHandle"
              @click="store.folderHandle ? parseFolder(store.folderHandle) : null"
              ) Re-open {{ store.folderHandle.name }}
            h-button(@click="askAndParseFolder") Select folder

  //- App description
  div(class="flex justify-center pb-20")
    div(class="shadow rounded p-5 space-y-3 backdrop-blur-md bg-white/30" style="width: 42rem")
      h3(class="font-bold") 👋 Greetings, stranger!
      p Delugr is a web-app that lets you browse the contents of your Deluge memory card.
      p It uses the new #[a(href="https://web.dev/file-system-access/") File System Access API] to read the contents of your memory card, so there's no need to install anything! As of May 2022, the API is not yet supported by Firefox, Safari or any of the mobile browsers.
      p Made with ❤️ by #[a(href="https://haila.fi") Teemu Haila] as #[a(href="https://github.com/MrHaila/delugr") open source]. Contributions welcome!

//- Actual thing
div(v-else class="flex h-screen")
  nav(aria-label="Sidebar" class="flex-shrink-0 bg-gray-800 flex flex-col justify-between text-gray-400")
    div(class="space-y-3 py-3")
      div(class="flex justify-center font-bold")
        router-link(to="/" class="text-gray-400 hover:text-gray-50 hover:no-underline") Delugr

      div.w-20.p-3.space-y-3
        sidebar-link(variant="songs")
        sidebar-link(variant="synths")
        sidebar-link(variant="kits")
        sidebar-link(variant="samples")

      //div(class="flex justify-center")
        RefreshIcon(aria-hidden="true" @click="parseFolder(store.folderHandle)" class="border border-gray-700 h-7 w-7 p-1 text-gray-400 hover:bg-gray-700 rounded")

    div(class="flex justify-center")
      a(href="https://haila.fi" target="_blank" class="h-4 mb-4 fill-current text-gray-400 hover:text-gray-50")
        h-logo

  router-view

</template>

<script lang="ts" setup>
import HLogo from './components/HLogo.vue'
import SidebarLink from './components/SidebarLink.vue'
import { parseFolder as actuallyParseFolder, useFiles } from './deluge/files'
import { ref } from 'vue'
import { get, set } from 'idb-keyval'
import { useDragAndDrop } from './useDragAndDrop'

const store = useFiles()
const isParsing = ref(false)

const dragAndDropMessage = ref('You can also drag and drop the folder here.')
const dropzone = ref<HTMLDivElement>()

async function onDrop(items: DataTransferItemList | null) {
  if (!items || items.length === 0) {
    dragAndDropMessage.value = 'No item dropped.'
    return
  }
  const item = items[0] // Get the dropped item from the event dataTransfer object
    
  const handle = await item.getAsFileSystemHandle() as FileSystemDirectoryHandle | FileSystemFileHandle

  if (handle.kind === 'directory') {
    parseFolder(handle)
    store.folderHandle = handle
    set('folderHandle', handle)
  } else {
    dragAndDropMessage.value = 'Please drop a folder, not a file.'
  }
}

const { isOverDropZone } = useDragAndDrop(dropzone, onDrop)

// async function onDrop (event: DragEvent) {
//   const item = event.dataTransfer?.items[0] // Get the dropped items from the event dataTransfer object
//   if (!item) {
//     dragAndDropMessage.value = 'No item dropped.'
//     return
//   }
    
//   const handle = await item.getAsFileSystemHandle() as FileSystemDirectoryHandle | FileSystemFileHandle

//   if (handle.kind === 'directory') {
//     await parseFolder(handle)
//     store.folderHandle = handle
//     set('folderHandle', handle)
//   } else {
//     dragAndDropMessage.value = 'Please drop a folder, not a file.'
//   }
// }

// Load previously selected folder from IndexedDB
getStoredHandle()
async function getStoredHandle() {
  const storedHandle = await get('folderHandle') as FileSystemDirectoryHandle
  if (storedHandle) {
    store.folderHandle = storedHandle
  }
}

/**
 * Ask the user to select a folder and parse it.
 */
async function askAndParseFolder() {
  try {
    const rootFolder = await window.showDirectoryPicker()
    if (rootFolder) {
      await parseFolder(rootFolder)
      store.folderHandle = rootFolder
      set('folderHandle', rootFolder)
    }
    else throw new Error('No folder selected')
  } catch (e) {
    console.error(e)
    store.parseError = String(e)
  }
}

/**
 * Parse a folder and manage the UI states while at it.
 */
async function parseFolder(rootFolder: FileSystemDirectoryHandle) {
  try {
    store.parsed = false
    store.parseError = null
    isParsing.value = true
    await actuallyParseFolder(rootFolder)
    isParsing.value = false
    document.getElementById('animation-root')?.remove()
  } catch (e) {
    console.error(e)
    store.parseError = String(e)
  }
}

// Animation shenanigans
if (!store.parsed) {
  // Root div for all animations
  document.getElementById('animation-root')?.remove() // Delete old stuff during HMR
  const animationRoot = document.createElement('div')
  animationRoot.id = 'animation-root'
  animationRoot.className = 'absolute top-0 right-0 bottom-0 left-0'
  animationRoot.style.background = 'linear-gradient(to bottom, rgb(243 244 246), rgb(229 231 235)'
  animationRoot.style.zIndex = '-3'

  const amount = 40
  for (let i = 0; i < amount; i++) {
    const small = Math.random() > .5

    // Div that moves...
    const movingContainer = document.createElement('div')
    movingContainer.className = 'move absolute'
    movingContainer.style.top = `${1 / amount * i * 100}%`
    movingContainer.style.zIndex = small ? '-2' : '-1'
    const moveAnimation = movingContainer.animate([
      { transform: 'translateX(100vw)' },
      { transform: 'translateX(-10vw)' }
    ], {
      duration: small ? 80000 : 40000, // ms
      iterations: Infinity,
    })
    moveAnimation.currentTime = Math.round(Math.random() * (small ? 80000 : 40000))

    // ...and the spinning image inside
    const spinningElement = document.createElement('img')
    spinningElement.src = '/favicon.png'
    const size = small ? 2 : 4
    spinningElement.style.width = `${size}rem`
    spinningElement.style.filter = 'invert(100%)' + (small ? ' brightness(105%)' : '')
    const spinAnimation = spinningElement.animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' }
    ], {
      duration: 20000,
      iterations: Infinity,
    })
    spinAnimation.currentTime = Math.round(Math.random() * 20000)

    // Mount
    movingContainer.appendChild(spinningElement)
    animationRoot.appendChild(movingContainer)
  }
  // Mount
  document.querySelector('body')?.appendChild(animationRoot)
}
</script>
