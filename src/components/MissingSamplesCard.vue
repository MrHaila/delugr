<template lang="pug">
HListCard(
  title="Missing Samples"
  subtitle="Sample references whole files could not be found. Maybe broken after manual changes?"
  :items="missingSamples"
  emptyLabel="No missing samples."
  )
  template(#item="{ item }")
    div(class="text-xs space-y-1")
      div(class="text-red-800 break-all") {{ item.path }}
      div(v-for="{ owner, locations } in groupReferencesByOwner(item.references)" :key="ownerKey(owner)" class="text-gray-500")
        | in #[RouterLink(:to="owner.fileUrl") {{ owner.fileName.split('.').at(0) }}]
        |  → {{ [describeOwner(owner), `(${locations.map(describeLocation).join(', ')})`].filter(Boolean).join(' ') }}
      div(v-if="likelyMatches.get(item.path)" class="text-gray-500")
        | Likely match: #[RouterLink(:to="likelyMatches.get(item.path)?.url ?? ''") {{ likelyMatches.get(item.path)?.path }}]
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { MissingSample, SampleFile } from "../composables/useFileStore";
import { findLikelyMatch } from "../deluge/files";
import {
  describeLocation,
  describeOwner,
  groupReferencesByOwner,
  ownerKey,
} from "../deluge/usage";

const props = defineProps<{
  missingSamples: MissingSample[];
}>();

const likelyMatches = computed(() => {
  const matches = new Map<string, SampleFile>();
  for (const missing of props.missingSamples) {
    const match = findLikelyMatch(missing.path);
    if (match) matches.set(missing.path, match);
  }
  return matches;
});
</script>
