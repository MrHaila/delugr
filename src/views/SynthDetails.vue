<template lang="pug">
//- TODO
//- - Add a button to show a modal to fix all fixable file paths (https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable)
//- - Add a delete button -> modal -> delete file


div(v-if="!props.name") No name prop... What?

div(v-else class="min-w-0 flex-1 h-full flex flex-col overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sound" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Synth '{{ props.name }}' not found!

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1(class="font-bold text-2xl") #[AdjustmentsVerticalIcon(class="h-5 inline mb-1")] {{ sound.data.presetName }}
        p(class="text-gray-400 text-sm") {{ sound.path }}
      div(class="text-right text-sm mt-3")
        p Firmware: {{ sound.firmware }}
        p Last modified: {{ DateTime.fromMillis(sound.lastModified).toFormat('yyyy-MM-dd') }}

    div(class="flex space-x-3")
      HListCard(
        title="Usage"
        :items="usageList"
        class="max-w-md md:flex-1"
        emptyLabel="Not used in any songs or kits."
        )
        template(#item="{ item }")
          div(class="flex flex-row space-x-1 items-baseline")
            MusicalNoteIcon(v-if="item.type === 'song'" class="h-3 inline mb-1")
            ArchiveBoxIcon(v-else-if="item.type === 'kit'" class="h-3 inline mb-1")
            RouterLink(:to="`/${item.type}s/${item.name}`") {{ item.name }}

      //HCard(class="max-w-md flex-1")
        template(#title) Synth Settings
        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row")
            div(class="basis-20") Synthesis mode
            div {{ sound.data.mode }}
          div(class="py-2 flex flex-row")
            div(class="basis-20") Voice priority
            div {{ sound.data.voicePriority }}
          div(class="py-2 flex flex-row")
            div(class="basis-20") Polyphony
            div {{ sound.data.polyphonic }}

    div(class="flex space-x-3")
      HCard(v-for="(oscillator, index) in [sound.data.osc1, sound.data.osc2]" class="flex-1")
        template(#title) Oscillator {{ index + 1 }}

        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row justify-between")
            div(class="basis-20") Type
            div {{ oscillator.sampleRanges ? 'multisample' : oscillator.type }}

          //div(class="py-2 flex flex-row justify-between" v-if="oscillator.transpose")
            div(class="basis-20") Transpose
            div {{ oscillator.transpose }}

          div(class="py-2 flex flex-row justify-between" v-if="oscillator.fileName")
            div(class="basis-20") Sample
            div(class="text-xs")
              RouterLink(v-if="oscillator.fileName" :to="String(getSampleUrlByPath(oscillator.fileName))") {{ oscillator.fileName }}
            
          div(v-if="oscillator.sampleRanges" class="pt-2")
            h3 Samples
            div(class="divide-y divide-gray-200")
              MultisampleSampleListItem(
                v-for="sampleRange in Object.values(oscillator.sampleRanges)"
                :sampleRange="sampleRange"
                :sourceFile="sound"
                )
    
    div(class="flex space-x-3")
      //h-card
        template(#title) Envelope 1
        div(class="divide-y divide-gray-200")
          div(class="py-2 flex flex-row")
            div(class="basis-40") Attack
            div {{ sound.data.env1?.attack.decimal }} - {{ sound.data.env1?.attack.fixh }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Decay
            div {{ sound.data.env1?.decay.decimal }} - {{ sound.data.env1?.decay.fixh }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Sustain
            div {{ sound.data.env1?.sustain.decimal }} - {{ sound.data.env1?.sustain.fixh }}
          div(class="py-2 flex flex-row")
            div(class="basis-40") Release
            div {{ sound.data.env1?.release.decimal }} - {{ sound.data.env1?.release.fixh }}

      //HCard(class="max-w-md md:flex-1")
        template(#title) Actions (TBD)
        div(class="space-x-3")
          h-button(variant="primary") Rename Synth
          h-button(variant="primary") Delete Synth

    TechnicalDetails(leftTitle="Parsed Synth Data" rightTitle="Raw Synth Data")
      template(#left)
        pre {{ sound.data }}

      template(#right)
        pre {{ sound.xml }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useFileStore } from '../composables/useFileStore'
import { DateTime } from 'luxon'
import { getSampleUrlByPath } from '../deluge/files'
import { MusicalNoteIcon, ArchiveBoxIcon } from '@heroicons/vue/20/solid'
import { AdjustmentsVerticalIcon } from '@heroicons/vue/24/solid'
import MultisampleSampleListItem from '../components/MultisampleSampleListItem.vue'
import TechnicalDetails from '../components/TechnicalDetails.vue'

const { fileStore } = useFileStore()

const props = defineProps([
  'name'
])


const sound = computed(() => props.name ? fileStore.sounds.find(sound => sound.name.split('.')[0] === props.name) : null)

const usageList = computed(() => {
  if (!sound.value?.usage) return []
  const songs = sound.value.usage.songs.map(name => ({ type: 'song', name }))
  const kits = sound.value.usage.kits.map(name => ({ type: 'kit', name }))
  return songs.concat(kits)
})
</script>