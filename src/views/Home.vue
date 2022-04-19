<template lang="pug">
div HOME

h-card
  template(#title) Songs
  dl(v-if="store.songs" class="sm:divide-y sm:divide-gray-200")
    div(v-for="file in store.songs.files" :key="file.name" class="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6")
      dt(class="text-sm font-medium text-gray-900") {{ file.name.slice(0, -4) }}
      dd(class="mt-1 text-sm text-gray-500 sm:mt-0 sm:col-span-2") {{ DateTime.fromMillis(file.lastModified).toFormat('yyyy-MM-dd') }}
  div(v-else) No content
</template>

<script lang="ts" setup>
import { DateTime } from 'luxon'
import { useStore } from '../store'

const store = useStore()
</script>