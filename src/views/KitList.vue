<template lang="pug">
main(class="min-w-0 flex-1 flex")
  navigation-list(
    title="Kits"
    :listItems="fileStore.kits"
  )

  router-view
</template>

<script lang="ts" setup>
import { useFileStore } from '../composables/useFileStore'

const props = defineProps([
  'name'
])

const { fileStore } = useFileStore()
</script>