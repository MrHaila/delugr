<template lang="pug">
div(v-if="fileStore.incompleteUsage.length > 0" class="rounded-md bg-yellow-50 border border-yellow-300 p-3 text-sm text-yellow-900 space-y-2")
  p(class="font-semibold") #[ExclamationTriangleIcon(class="h-4 inline mb-0.5")] Sample usage may be incomplete
  p {{ fileStore.incompleteUsage.length === 1 ? 'One file' : `${fileStore.incompleteUsage.length} files` }} in SONGS, SYNTHS or KITS could not be fully read, so they may reference samples Delugr can't see. Usage, unused samples and missing samples may be wrong.
  ul(class="list-disc pl-5 space-y-1 text-xs")
    li(v-for="file in fileStore.incompleteUsage" :key="file.path")
      span(class="font-medium break-all") {{ file.path }}
      span(class="text-yellow-800")  — {{ file.reason }}
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from '@heroicons/vue/20/solid'
import { useFileStore } from '../composables/useFileStore'

const { fileStore } = useFileStore()
</script>
