<template lang="pug">
main(class="min-w-0 flex-1 flex")
  aside(v-if="props.list" class="shrink-0 border-r border-gray-200 bg-gray-100 w-72 divide-y divide-gray-200 overflow-y-auto")
    //- List bar
    h1.pl-3.py-2.font-bold {{ props.list.title }} #[badge {{ props.list.listItems.length }}]
    router-link(
      v-if="props.list.listItems.length > 0"
      v-for="item in props.list.listItems"
      :to="item.url"
      :class="['flex justify-between p-3 cursor-pointer text-sm', item.active ? 'bg-amber-400' : 'hover:bg-gray-300']"
    )
      dt(class="font-medium text-gray-900 whitespace-nowrap basis-2/3 truncate") {{ item.name }}
      dd(class="text-gray-500 mt-0 col-span-2") {{ item.date?.toFormat('yyyy-MM-dd') }}

    div(v-else)
      h1.text-center.text-gray-500.font-bold.p-4 No items
      
  section(aria-labelledby="primary-heading" class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
    slot
</template>

<script lang="ts" setup>
import { DateTime} from 'luxon'

interface Props {
  list?: {
    title: string,
    listItems: {
      name: string,
      date: DateTime,
      url: string,
      active: boolean,
    }[]
  }
}

const props = defineProps<Props>()
</script>
