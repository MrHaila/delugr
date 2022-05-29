<template lang="pug">
main(class="flex")
  navigation-list(
    title="Samples"
    :listItems="store.samples"
  )

  router-view(style="min-width: 31rem")
</template>

<script lang="ts" setup>
import { useStore } from '../deluge/files'

const props = defineProps([
  'name'
])

const store = useStore()
</script>