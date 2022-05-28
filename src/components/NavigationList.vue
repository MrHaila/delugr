<template lang="pug">
aside(class="shrink-0 border-r border-gray-200 bg-gray-100 w-72 divide-y divide-gray-200 overflow-y-auto")
  //- Header
  div(class="flex")
    //div(
      @click="currentNavigationLevel.parent ? currentNavigationLevel = currentNavigationLevel.parent : ''"
      class="aspect-square self-center p-3 cursor-pointer"
      ) back
    h1(class="pl-3 py-2 font-bold") {{ currentNavigationLevel.name }} #[h-badge {{ Number(currentNavigationLevel.folders?.length) + Number(currentNavigationLevel.files?.length) | 0 }}]

  //- Folders
  div(
    v-for="navLevel in currentNavigationLevel.folders"
    @click="currentNavigationLevel = navLevel"
    :class="['flex justify-between p-3 cursor-pointer text-sm']"
    )
    dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ lastFolderFromPath(navLevel.name) }} 

  //- Files
  //router-link(
    v-for="file in currentNavigationLevel.files"
    :to="file.url"
    :class="['flex justify-between p-3 cursor-pointer text-sm', getBackgroundClass(file)]"
    )
    // dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ file.name }} #[exclamation-circle-icon(v-if="file.problem" class="h-4 inline text-red-400 align-text-top")]
    dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ file.name.slice(0, -4) }} #[span(v-if="isUnused(file)" class="text-xs font-light text-gray-500") un-used]
    dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(file.file.lastModified).toFormat('yyyy-MM-dd') }}
  router-link(
    v-for="file in currentNavigationLevel.files"
    :to="file.url"
    :class="['flex justify-between p-3 cursor-pointer text-sm hover:no-underline']"
    )
    // dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ file.name }} #[exclamation-circle-icon(v-if="file.problem" class="h-4 inline text-red-400 align-text-top")]
    dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ file.name.slice(0, -4) }}
    dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(file.file.lastModified).toFormat('yyyy-MM-dd') }}
  
//aside(class="shrink-0 border-r border-gray-200 bg-gray-100 w-72 divide-y divide-gray-200 overflow-y-auto")
  //- List bar
  h1(class="pl-3 py-2 font-bold") {{ props.title }} #[h-badge {{ props.listItems.length }}]
  div(
    v-if="props.listItems.length > 0"
    v-for="path in listItemPaths"
    )
    div(v-if="listItemPaths.length > 1" class="py-1 px-3 text-sm font-semibold bg-gray-400") {{ path }}
    router-link(
      v-for="item in props.listItems.filter(item => item.path.split('/').slice(1, -1).join('/') === path)"
      :to="item.url"
      :class="['flex justify-between p-3 cursor-pointer text-sm', getBackgroundClass(item)]"
      )
      // dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ item.name }} #[exclamation-circle-icon(v-if="item.problem" class="h-4 inline text-red-400 align-text-top")]
      dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ item.name.slice(0, -4) }} #[span(v-if="isUnused(item)" class="text-xs font-light text-gray-500") un-used]
      dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(item.file.lastModified).toFormat('yyyy-MM-dd') }}

  div(v-else)
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

type NavigationLevel = {
  name: string,
  parent?: NavigationLevel,
  folders: NavigationLevel[],
  files: (ParsedFile | SampleFile)[],
}

type Props = {
  title: string,
  listItems: (ParsedFile | SampleFile)[],
}
const props = defineProps<Props>()

const currentFolderPath = ref('/')
const root = computed(() => buildNavigationLevelForPath('/'))
const currentNavigationLevel = ref(root.value)

function buildNavigationLevelForPath(path: string, parent?: NavigationLevel): NavigationLevel {
  const files = props.listItems.filter(item => item.path.split('/').slice(0, -1).join('/') + '/' === path)
  const folders = props.listItems
    .filter(item => item.path.split('/').slice(0, -1).join('/').startsWith(path)) // Find further folders that start with current path
    .map(item => path + item.path.slice(path.length).split('/')[0]) // Drop all but the next path level
    .reduce<string[]>((accumulator, item) => { // Remove duplicates
      if (!accumulator.includes(item)) accumulator.push(item)
      return accumulator
    }, [])

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

  const rootObject: NavigationLevel = {
    name: path,
    parent,
    folders: folders.map(item => buildNavigationLevelForPath(item + '/')),
    files: files,
  }

  return getFirstFolderWithContent(rootObject)
}

const lastFolderFromPath = function (path: string): string {
  const folders = path.split('/')
  return folders[folders.length - 2]
}

// Get a list of unique paths
const listItemPaths = computed(() => { 
  return props.listItems
    .map(item => item.path.split('/').slice(1, -1).join('/')) // Remove file name and beginning slash
    .reduce<string[]>((accumulator, item, index, array) => {
      if (index === 0) {
        accumulator.push(item)
      } else if (!accumulator.includes(item)) {
        accumulator.push(item)
      }
      return accumulator.sort()
    }, [])
})

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
const isUnused = (item: ParsedFile | SampleFile): boolean => {
  // Non-samples have a type.
  if ('type' in item) {
    // Songs can't be un-used
    if (item.type === FileType.Song) return false
  }
  if ((Object.keys(item.usage.kits).length === 0 && Object.keys(item.usage.sounds).length === 0 && Object.keys(item.usage.songs).length === 0)) return true
  return false
}

function isItemActive(item: ParsedFile | SampleFile) {
  if ('id' in item) {
    return active.value === item.id.toString()
  } else {
    return active.value === item.name.slice(0, -4)
  }
}

function getBackgroundClass(item: ParsedFile | SampleFile) {
  if (isItemActive(item)) {
    return 'bg-amber-400'
  } else if (isUnused(item)) {
    return 'bg-gray-200'
  } else {
    return 'hover:bg-gray-300'
  }
}
</script>
