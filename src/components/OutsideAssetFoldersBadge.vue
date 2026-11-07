<template lang="pug">
p(v-if="file.outsideAssetFolders" class="text-xs text-amber-700" title="Not in SONGS, SYNTHS or KITS. Still listed and counted toward sample usage.") Outside asset folders
</template>

<script lang="ts" setup>
import type { ParsedAssetFile } from '../composables/useFileStore'

defineProps<{
  file: ParsedAssetFile
}>()
</script>
