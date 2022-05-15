<template lang="pug">
aside(class="shrink-0 border-r border-gray-200 bg-gray-100 w-72 divide-y divide-gray-200 overflow-y-auto")
  //- List bar
  h1(class="pl-3 py-2 font-bold") {{ props.title }} #[h-badge {{ props.listItems.length }}]
  router-link(
    v-if="props.listItems.length > 0"
    v-for="item in props.listItems"
    :to="item.url"
    :class="['flex justify-between p-3 cursor-pointer text-sm', props.active === item.name ? 'bg-amber-400' : 'hover:bg-gray-300', (props.usage && !Object.hasOwn(props.usage, item.name)) ? 'bg-gray-200' : '']"
    )
    // dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ item.name }} #[exclamation-circle-icon(v-if="item.problem" class="h-4 inline text-red-400 align-text-top")]
    dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ item.name.slice(0, -4) }} #[span(v-if="props.usage && !Object.hasOwn(props.usage, item.name)" class="text-xs font-light text-gray-500") un-used]
    dd(class="text-gray-500 mt-0 col-span-2") {{ DateTime.fromMillis(item.file.lastModified).toFormat('yyyy-MM-dd') }}

  //div(v-else)
    h1(class="text-center text-gray-500 font-bold p-4") No items
</template>

<script lang="ts" setup>
import type { ParsedSongFile, ParsedSoundFile, ParsedKitFile, SampleFile } from '../deluge/files'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'

interface Props {
  title: string,
  listItems: ParsedSongFile[] | ParsedSoundFile[] | ParsedKitFile[] | SampleFile[],
  active?: string,
  usage?: { [key: string]: string[] },
}

const props = defineProps<Props>()
</script>
