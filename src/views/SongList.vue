<template lang="pug">
main(class="min-w-0 flex-1 flex")
  navigation-list(
    title="Songs"
    :listItems="store.songs"
    :active="props.name || ''"
  )

  router-view()
</template>

<script lang="ts" setup>
import { useStore } from '../deluge/files'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon } from '@heroicons/vue/solid'

const props = defineProps([
  'name'
])

const store = useStore()
</script>