<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!song" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Song '{{ props.name }}' not found!

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") #[MusicalNoteIcon(class="h-5 inline mb-1")] {{ props.name }}
        p(class="text-gray-400 text-sm") {{ song.path }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ song.firmware }}
        p Last modified: {{ DateTime.fromMillis(song.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      //- Instrument list
      HListCard(
        v-if="song.data.instruments"
        title="Instruments"
        :items="song.data.instruments"
        class="max-w-md md:flex-1"
        )
        template(#item="{ item }")
          div(class="flex flex-row space-x-1 items-baseline")
            AdjustmentsVerticalIcon(v-if="item.instrumentType === 'sound'" class="h-3 inline mb-1")
            ArchiveBoxIcon(v-else-if="item.instrumentType === 'kit'" class="h-3 inline mb-1")
            MicrophoneIcon(v-else-if="item.instrumentType === 'audio track'" class="h-3 inline mb-1")
            EllipsisHorizontalIcon(v-else-if="item.instrumentType === 'midi track'" class="h-3 inline mb-1")

            span(v-if="item.instrumentType === 'midi track'") MIDI Track
            span(v-else) {{ item.presetName }}

            span(class="flex-grow text-right text-xs")
              RouterLink(v-if="item.instrumentType === 'sound' && fileStore.sounds.find(sound => sound.name.split('.')[0] === item.presetName)" :to="'/synths/' + item.presetName") View preset
              RouterLink(v-else-if="item.instrumentType === 'kit' && fileStore.kits.find(kit => kit.name.split('.')[0] === item.presetName)" :to="'/kits/' + item.presetName") View preset
              span(v-else-if="item.instrumentType === 'audio track'") Input channel: {{ item.inputChannel }}
              span(v-else-if="item.instrumentType !== 'midi track'" class="text-gray-400") No preset found

            // exclamation-circle-icon(v-if="item.problem" class="h-4 text-red-400")
      
      //HCard(class="max-w-md md:flex-1")
        template(#title) Actions
        div(class="space-x-3")
          h-button(@click="renameModal?.openModal()") Rename Song
          h-button(@click="deleteModal?.openModal()" variant="danger") Delete Song

        h-modal(ref="renameModal" variant="warning" okLabel="Rename")
          template(#title) Rename Song
          template(#message) Renaming a song will change the actual file name on the memory card.
          
          div FORM TBD

        h-modal(ref="deleteModal" variant="danger" okLabel="Delete")
          template(#title) Delete Song
          template(#message) Are you sure you want to permanently delete this song? This action can't be undone.


    TechnicalDetails(leftTitle="Parsed Song Data" rightTitle="Raw Song Data")
      template(#left)
        pre {{ song.data }}

      template(#right)
        pre {{ song.xml }}
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useFileStore } from '../composables/useFileStore'
import { DateTime } from 'luxon'
import { ExclamationCircleIcon, ArchiveBoxIcon, AdjustmentsVerticalIcon, MicrophoneIcon, EllipsisHorizontalIcon } from '@heroicons/vue/20/solid'
// import HModal from '../components/HModal.vue'
import { MusicalNoteIcon } from '@heroicons/vue/24/solid'
import TechnicalDetails from '../components/TechnicalDetails.vue'

const { fileStore } = useFileStore()

const props = defineProps([
  'name'
])

// const renameModal = ref<InstanceType<typeof HModal> | null>(null)
// const deleteModal = ref<InstanceType<typeof HModal> | null>(null)

const song = computed(() => props.name ? fileStore.songs.find(song => song.name.split('.')[0] === props.name) : null)
</script>