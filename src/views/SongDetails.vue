<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!song" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Song '{{ props.name }}' not found!

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") Song: {{ props.name }}
        p(class="text-gray-400 text-sm") {{ song.path }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ song.firmware }}
        p Last modified: {{ DateTime.fromMillis(song.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      h-list-card(
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
            span(v-else class="text-xs") {{ item.instrumentType }}

            span {{ item.presetName }}
            
            span(class="flex-grow text-right")
              router-link(v-if="item.instrumentType === 'sound' && store.sounds.find(sound => sound.name.split('.')[0] === item.presetName)" :to="'/synths/' + item.presetName" class="text-xs") View preset
              router-link(v-else-if="item.instrumentType === 'kit' && store.kits.find(kit => kit.name.split('.')[0] === item.presetName)" :to="'/kits/' + item.presetName" class="text-xs") View preset
              span(v-else class="text-xs text-gray-400") No preset found

            // exclamation-circle-icon(v-if="item.problem" class="h-4 text-red-400")
      
      //h-card(class="max-w-md md:flex-1")
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


    h2(class="font-bold text-xl") Technical Details
    p(class="text-sm") The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing. Here's a dump of what I've managed to parse so far:

    div(class="flex space-x-3" style="font-size: 60%;")
      div(class="rounded bg-gray-300 p-3 font-mono max-w-xl")
        h3(class="font-bold") PARSED SONG DATA
        pre {{ song.data }}

      div(class="rounded bg-gray-300 p-3 font-mono max-w-xl")
        h3(class="font-bold") RAW SONG DATA
        pre(class="break-all whitespace-pre-wrap") {{ song.xml }}
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useStore } from '../deluge/files'
import { DateTime } from 'luxon'
import { ChevronLeftIcon, ExclamationCircleIcon, MusicalNoteIcon, ArchiveBoxIcon, AdjustmentsVerticalIcon, MicrophoneIcon, ChevronRightIcon, FolderIcon } from '@heroicons/vue/20/solid'
import HModalVue from '../components/HModal.vue';

const store = useStore()

const props = defineProps([
  'name'
])

const renameModal = ref<InstanceType<typeof HModalVue> | null>(null)
const deleteModal = ref<InstanceType<typeof HModalVue> | null>(null)

const song = computed(() => props.name ? store.songs.find(song => song.name.split('.')[0] === props.name) : null)
</script>