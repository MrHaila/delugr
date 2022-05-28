<template lang="pug">
// div(class="absolute top-0 right-0 bottom-0 left-0 bg-gray-400")
  div(class="move")
    img(src="/favicon.png" class="w-16 h-8 spin")

//- Landing page
div(v-if="!store.parsed" class="mt-20 space-y-20 mb-20")
  div(class="text-center")
    h1(class="text-8xl font-bold mb-5 text-gray-900") Delurg
    h2(class="text-2xl text-gray-900 font-semibold") The Synthstrom Deluge file browser... in the browser!

  div(class="space-y-20")
    div(class="flex justify-center text-center")
      div(class="p-8 rounded-xl border-dashed border-gray-400 bg-sky-50/50 backdrop-blur-md border-4" style="width: 32rem; height: 9.7rem")
        div(v-if="!store.folderName")
          p(class="mb-5") Select the Deluge memory card root folder to get started.
          h-button(@click="getFolder") Select folder
        div(v-else class="text-center space-y-3")
          h1(class="mb-6") Parsing the folder contents...
          p(class="text-xl font-bold") {{ store.filesScanned }} files scanned

    div(class="flex justify-center")
      div(class="shadow rounded p-5 space-y-3 backdrop-blur-md bg-white/30" style="width: 42rem")
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
        router-link(to="/" class="text-gray-400 hover:text-gray-50 hover:no-underline") Delugr

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

/**
 * Ask for a folder and parse the contents.
 */
async function getFolder() {
  // Ask for a folder
  // TODO: handle cancels and other such errors
  rootFolder = await window.showDirectoryPicker()
  store.folderName = rootFolder.name
  store.folderHandle = rootFolder

  // Parse!
  await parseFolder(rootFolder)
  document.getElementById('animation-root')?.remove()
}

// Animation shenanigans
// Root div for all animations
document.getElementById('animation-root')?.remove() // Delete old stuff during HMR
const animationRoot = document.createElement('div')
animationRoot.id = 'animation-root'
animationRoot.className = 'absolute top-0 right-0 bottom-0 left-0'
animationRoot.style.background = 'linear-gradient(to bottom, rgb(243 244 246), rgb(229 231 235)'
animationRoot.style.zIndex = '-2'

const amount = 40
for (let i = 0; i < amount; i++) {
  const small = Math.random() > .5

  // Div that moves...
  const movingContainer = document.createElement('div')
  movingContainer.className = 'move absolute'
  movingContainer.style.top = `${1 / amount * i * 100 + 3}%`
  movingContainer.style.zIndex = '-1'
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
  spinningElement.style.filter = 'invert(100%)'
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
document.getElementById('app')?.appendChild(animationRoot)

</script>
