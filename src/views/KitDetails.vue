<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!kit" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Kit '{{ props.name }}' not found!

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") #[ArchiveBoxIcon(class="h-5 inline mb-1")] {{ kit.data.presetName }}
        p(class="text-gray-400 text-sm") {{ kit.path }}
        OutsideAssetFoldersBadge(:file="kit")
      div(class="text-right text-sm mt-3")
        p Firmware: {{ kit.firmware }}
        p Last modified: {{ DateTime.fromMillis(kit.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      DerivedInstancesCard(:preset="kit" class="max-w-md md:flex-1")


      HCard(v-if="kit.data.soundSources" class="max-w-md md:flex-1")
        template(#title) Drums #[h-badge {{ Object.keys(kit.data.soundSources).length }}]
        div(class="divide-y divide-gray-200")
          SoundSamplesListItem(v-for="(sound, index) in Object.values(kit.data.soundSources)" :key="index" :sound="sound")

    TechnicalDetails(leftTitle="Parsed Kit Data" rightTitle="Raw Kit Data")
      template(#left)
        pre {{ kit.data }}

      template(#right)
        pre {{ kit.xml }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useFileStore } from '../composables/useFileStore'
import { DateTime } from 'luxon'
import SoundSamplesListItem from '../components/SoundSamplesListItem.vue'
import DerivedInstancesCard from '../components/DerivedInstancesCard.vue'
import OutsideAssetFoldersBadge from '../components/OutsideAssetFoldersBadge.vue'
import { ArchiveBoxIcon } from '@heroicons/vue/24/solid'
import TechnicalDetails from '../components/TechnicalDetails.vue'

const { fileStore } = useFileStore()

const props = defineProps([
  'name'
])

const kit = computed(() => props.name ? fileStore.kits.find(kit => kit.name.split('.')[0] === props.name) : null)
</script>