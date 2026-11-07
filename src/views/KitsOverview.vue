<template lang="pug">
PresetsOverview(
  :presets="fileStore.kits"
  noun="kit"
  leaderboardSubtitle="Songs with an Instance derived from the preset (same name)."
  )
</template>

<script lang="ts" setup>
import { useFileStore } from '../composables/useFileStore'
import PresetsOverview from '../components/PresetsOverview.vue'

const { fileStore } = useFileStore()
</script>
