<template lang="pug">
main(class="min-w-0 flex-1 flex")
  navigation-list(
    title="Samples"
    :listItems="store.samples"
  )

  router-view
</template>

<script lang="ts" setup>
import { useFiles } from '../deluge/files'

const props = defineProps([
  'name'
])

const store = useFiles()
</script>