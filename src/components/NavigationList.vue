<template lang="pug">
aside(class="shrink-0 border-r border-gray-200 bg-gray-100 w-72 divide-y divide-gray-200 overflow-y-auto")
  //- List bar
  h1(class="pl-3 py-2 font-bold") {{ props.title }} #[h-badge {{ props.listItems.length }}]
  router-link(
    v-if="props.listItems.length > 0"
    v-for="item in props.listItems"
    :to="item.url"
    :class="['flex justify-between p-3 cursor-pointer text-sm', active === item.name.slice(0, -4) ? 'bg-amber-400' : 'hover:bg-gray-300', isUnused(item) ? 'bg-gray-200' : '']"
    )
    // dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ item.name }} #[exclamation-circle-icon(v-if="item.problem" class="h-4 inline text-red-400 align-text-top")]
    dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ item.name.slice(0, -4) }} #[span(v-if="isUnused(item)" class="text-xs font-light text-gray-500") un-used]
    dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(item.file.lastModified).toFormat('yyyy-MM-dd') }}

  //div(v-else)
    h1(class="text-center text-gray-500 font-bold p-4") No items
</template>

<script lang="ts" setup>
import type { SampleFile, ParsedFile } from '../deluge/files'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { isArray } from '@vue/shared'
import { FileType } from '../deluge/files'

// Props
interface Props {
  title: string,
  listItems: ParsedFile[] | SampleFile[],
}
const props = defineProps<Props>()

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
</script>
