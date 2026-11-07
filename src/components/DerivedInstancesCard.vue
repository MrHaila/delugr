<template lang="pug">
HCard(subtitle="Instances and Drums with the same name as this preset. They are copies and may have drifted apart, so this never affects sample usage.")
  template(#title) Derived from this preset #[h-badge {{ preset.derivedInstances.length }}]
  p(v-if="!isPresetInAnySong(preset)" class="text-sm text-gray-500 italic py-2") Not in any song.
  div(class="divide-y divide-gray-200")
    div(v-for="(item, index) in preset.derivedInstances" :key="index" class="py-2 flex flex-row space-x-1 items-baseline")
      MusicalNoteIcon(v-if="item.fileType === 'song'" class="h-3 inline mb-1")
      ArchiveBoxIcon(v-else-if="item.fileType === 'kit'" class="h-3 inline mb-1")
      RouterLink(:to="item.fileUrl") {{ item.fileName.split('.')[0] }}
      span(v-if="describeOwner(item)" class="text-xs text-gray-400") {{ describeOwner(item) }}
</template>

<script lang="ts" setup>
import { MusicalNoteIcon, ArchiveBoxIcon } from '@heroicons/vue/20/solid'
import type { ParsedKitFile, ParsedSoundFile } from '../composables/useFileStore'
import { describeOwner, isPresetInAnySong } from '../deluge/usage'

defineProps<{
  preset: ParsedSoundFile | ParsedKitFile
}>()
</script>
