<template lang="pug">
aside(class="shrink-0 border-r border-gray-200 bg-gray-100 w-72 divide-y divide-gray-200 overflow-y-auto")
  //- Header
  div(class="flex")
    div(
      @click="navigateBack"
      :class="['self-center m-1 p-1 cursor-pointer hover:bg-gray-300 active:bg-gray-400 flex items-center rounded select-none', { 'text-gray-300 disabled pointer-events-none': currentNavigationLevel.name === '/' } ]"
      )
      chevron-left-icon(class="h-5")
      span(class="mr-2") Back
    h1(class="pl-1 py-2 font-bold") {{ currentNavigationLevel.name }}

  //- Folders
  h3(v-if="currentNavigationLevel.folders?.length > 0" class="font-bold py-1 px-3 bg-gray-200 text-xs flex items-center")
    folder-icon(class="h-3 mr-1")
    | Folders #[span(class="text-gray-400 ml-2 font-normal") {{ Number(currentNavigationLevel.folders?.length) | 0 }}]
  div(
    v-for="navLevel in currentNavigationLevel.folders"
    @click="currentNavigationLevel = navLevel"
    :class="['flex justify-between p-3 cursor-pointer text-sm hover:bg-gray-300 active:bg-gray-400']"
    )
    dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ lastFolderFromPath(navLevel.name) }} 
    chevron-right-icon(class="h-5")

  //- Files
  h3(v-if="currentNavigationLevel.files?.length > 0" class="font-bold py-1 px-3 bg-gray-200 text-xs flex items-center")
    music-note-icon(v-if="title === 'Songs'" class="h-3 mr-1")
    adjustments-icon(v-else-if="title === 'Synths'" class="h-3 mr-1")
    archive-icon(v-else-if="title === 'Kits'" class="h-3 mr-1")
    microphone-icon(v-else-if="title === 'Samples'" class="h-3 mr-1")
    | {{ title }} #[span(class="text-gray-400 ml-2 font-normal") {{ Number(currentNavigationLevel.files?.length) | 0 }}]
  router-link(
    v-for="file in currentNavigationLevel.files"
    :to="file.url"
    :class="['flex justify-between p-3 cursor-pointer text-sm hover:no-underline', getBackgroundClass(file)]"
    )
    // dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ file.name }} #[exclamation-circle-icon(v-if="file.problem" class="h-4 inline text-red-400 align-text-top")]
    dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ file.name.slice(0, -4) }} #[span(v-if="isUnused(file)" class="text-xs font-light text-gray-500") un-used]
    dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(file.file.lastModified).toFormat('yyyy-MM-dd') }}

div(v-if="props.listItems.length === 0 || (currentNavigationLevel.files?.length === 0 && currentNavigationLevel.folders?.length === 0)")
  h1(class="text-center text-gray-500 font-bold p-4") No items
</template>

<script lang="ts" setup>
import type { SampleFile, ParsedFile } from '../deluge/files'
import { FileType } from '../deluge/files'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { isArray } from '@vue/shared'
import { MusicNoteIcon, ArchiveIcon, AdjustmentsIcon, MicrophoneIcon, ChevronRightIcon, ChevronLeftIcon, FolderIcon } from '@heroicons/vue/solid'

type NavigationLevel = {
  name: string,
  folders: NavigationLevel[],
  files: (ParsedFile | SampleFile)[],
}

type Props = {
  title: string,
  listItems: (ParsedFile | SampleFile)[],
}
const props = defineProps<Props>()

// Folders and folder navigation magic
const root = computed(() => buildNavigationLevelForPath('/'))
const firstFolderWithContent = computed(() => getFirstFolderWithContent(root.value))
const currentNavigationLevel = ref(firstFolderWithContent.value)

function buildNavigationLevelForPath(path: string): NavigationLevel {
  const files = props.listItems.filter(item => item.path.split('/').slice(0, -1).join('/') + '/' === path)
  const folders = props.listItems
    .filter(item => item.path.split('/').slice(0, -1).join('/').startsWith(path)) // Find further folders that start with current path
    .map(item => path + item.path.slice(path.length).split('/')[0]) // Drop all but the next path level
    .reduce<string[]>((accumulator, item) => { // Remove duplicates
      if (!accumulator.includes(item)) accumulator.push(item)
      return accumulator
    }, [])

  return {
    name: path,
    folders: folders.map(item => buildNavigationLevelForPath(item + '/')),
    files: files,
  }
}

function getFirstFolderWithContent(navLevel: NavigationLevel): NavigationLevel {
    // Return if there is no content
    if (navLevel.files.length === 0 && navLevel.folders.length === 0) return navLevel
    // Return if are any files
    if (navLevel.files.length > 0) return navLevel
    // Return if are two or more folders
    if (navLevel.folders.length > 1) return navLevel
    // ...or look deeper into the only folder
    return getFirstFolderWithContent(navLevel.folders[0])
  }

const navigateBack = function() {
  let folders = currentNavigationLevel.value.name.split('/')
  folders = folders.slice(1, -2)

  let newNavigationLevel = root.value
  for (const folder of folders) {
    const subfolder = newNavigationLevel.folders.find(item => item.name === newNavigationLevel.name + folder + '/')
    if (!subfolder) throw new Error('Could not find folder ' + newNavigationLevel.name + folder + ' in the folders of ' + newNavigationLevel.name)
    newNavigationLevel = subfolder
  }
  currentNavigationLevel.value = newNavigationLevel
}

const lastFolderFromPath = function (path: string): string {
  const folders = path.split('/')
  return folders[folders.length - 2]
}

// Highlight entry based on current route
let active = ref('')
function setActive(name: string | string[]) {
  if (isArray(name)) {
    active.value = name[0]
  } else {
    active.value = name
  }
}
const route = useRoute()
setActive(route.params.name)
watch(
  () => route.params.name,
  newName => setActive(newName)
)

/**
 * Figure out if an item should be flagged as un-used.
 * @param item Item to check.
 */
const isUnused = (item: ParsedFile | SampleFile | any): boolean => {
  // Non-samples have a type.
  if ('type' in item) {
    // Songs can't be un-used
    if (item.type === FileType.Song) return false
  }
  if ((Object.keys(item.usage.kits).length === 0 && Object.keys(item.usage.sounds).length === 0 && Object.keys(item.usage.songs).length === 0)) return true
  return false
}

function isItemActive(item: ParsedFile | SampleFile | any) {
  if ('id' in item) {
    return active.value === item.id.toString()
  } else {
    return active.value === item.name.slice(0, -4)
  }
}

function getBackgroundClass(item: ParsedFile | SampleFile | any) {
  if (isItemActive(item)) {
    return 'bg-amber-400'
  } else if (isUnused(item)) {
    return 'bg-gray-200'
  } else {
    return 'hover:bg-gray-300'
  }
}
</script>
