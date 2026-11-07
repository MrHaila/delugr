<template lang="pug">
HListCard(
  title="Missing Samples"
  subtitle="Sample references whose path matches no sample on the card. A likely match is only a suggestion."
  :items="missingSamples"
  emptyLabel="No missing samples."
  )
  template(#item="{ item }")
    div(class="text-xs space-y-1")
      div(class="text-red-800 break-all") {{ item.path }}
      div(v-for="owner in ownersOf(item)" :key="owner.key" class="text-gray-500")
        | in 
        RouterLink(:to="owner.fileUrl") {{ owner.fileName.split('.')[0] }}
        span(v-if="owner.detail")  → {{ owner.detail }}
      div(v-if="likelyMatches.get(item.path)" class="text-gray-500")
        | Likely match: 
        RouterLink(:to="likelyMatches.get(item.path)!.url") {{ likelyMatches.get(item.path)!.path }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { MissingSample, SampleFile } from '../composables/useFileStore'
import { findLikeliestMatchForMisplacedSample } from '../deluge/files'
import { describeOwner } from '../deluge/usage'

const props = defineProps<{
  missingSamples: MissingSample[]
}>()

/**
 * One line per owner (file → Instance/Drum), listing where in the instrument the reference sits.
 */
function ownersOf(missing: MissingSample) {
  const owners = new Map<string, { key: string, fileName: string, fileUrl: string, detail: string, locations: string[] }>()
  for (const ref of missing.references) {
    const instrument = describeOwner(ref.owner)
    const key = `${ref.owner.filePath}|${instrument}`
    const entry = owners.get(key) ?? { key, fileName: ref.owner.fileName, fileUrl: ref.owner.fileUrl, detail: '', locations: [] }
    entry.locations.push(ref.location)
    entry.detail = [instrument, `(${entry.locations.join(', ')})`].filter(Boolean).join(' ')
    owners.set(key, entry)
  }
  return [...owners.values()]
}

const likelyMatches = computed(() => {
  const matches = new Map<string, SampleFile>()
  for (const missing of props.missingSamples) {
    const match = findLikeliestMatchForMisplacedSample(missing.path)
    if (match) matches.set(missing.path, match)
  }
  return matches
})
</script>
