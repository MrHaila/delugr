<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="flex-1 h-full overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sample" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Sample not found! {{ store.samples.length }} samples in total

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl #[MicrophoneIcon(class="h-5 inline mb-1")] {{ sample.name.split('.')[0] }}
        p(class="text-gray-400 text-sm") {{ sample.path }} #[span(class="text-xs") ({{ filesize(sample.size) }})]
      div(class="text-right text-sm mt-3")
        p Last modified: {{ DateTime.fromMillis(sample.lastModified).toFormat('yyyy-MM-dd') }}

    HCard(
      class="w-full"
      title="Preview"
      )
      div#wavesurfer

    div(class="flex space-x-3")
      HCard(class="max-w-3xl flex-1")
        template(#title) Usage
        div(v-if="sample.usage.total" class="flex justify-between space-x-3")
          div(class="flex-1")
            HList(
              title="Songs"
              :object="sample.usage.songs"
              )
              template(#item="{ item }")
                MusicalNoteIcon(class="h-3 inline mb-1 mr-1")
                RouterLink(:to="'/songs/' + item.key") {{ item.key }}
                span(class="text-xs text-gray-400")  via {{ item.value.instrumentName }}
          
          div(class="flex-1")
            HList(
              title="Kits"
              :object="sample.usage.kits"
              )
              template(#item="{ item }")
                ArchiveBoxIcon(class="h-3 inline mb-1 mr-1")
                RouterLink(:to="'/kits/' + item.key") {{ item.key }}
                span(class="text-xs text-gray-400")  via {{ item.value.instrumentName }}
          
          div(class="flex-1")
            HList(
              title="Synths"
              :object="sample.usage.sounds"
              )
              template(#item="{ item }")
                AdjustmentsVerticalIcon(class="h-3 inline mb-1 mr-1")
                RouterLink(:to="'/synths/' + item.key") {{ item.key }}
        
        div(v-else class="italic text-gray-400") Not used in any songs, kits or synths.
</template>

<script lang="ts" setup>
import { MusicalNoteIcon, ArchiveBoxIcon, AdjustmentsVerticalIcon, MicrophoneIcon } from '@heroicons/vue/24/solid'
import { computed, onMounted, watch } from 'vue'
import { useFiles } from '../deluge/files'
import { DateTime } from 'luxon'
import WaveSurfer from 'wavesurfer.js'
import { filesize } from 'filesize'

const store = useFiles()

const props = defineProps([
  'name'
])

const idAsNumber = computed(() => parseInt(props.name))
const sample = computed(() => props.name ? store.samples.find(sample => sample.id === idAsNumber.value) : null)

let wavesurfer: WaveSurfer

onMounted(async () => {
  wavesurfer = WaveSurfer.create({
    container: '#wavesurfer',
    waveColor: 'gray',
    progressColor: 'orange',
    barWidth: 3,
    barRadius: 3,
    cursorWidth: 1,
    barGap: 3,
    cursorColor: 'orange',
  })

  if (sample.value) {
    wavesurfer.on('ready', function(e) {
      wavesurfer.play()
    })

    // Play on click
    // wavesurfer.on('click', function(e) {
    //   wavesurfer.playPause()
    // })

    // Play after seeking
    wavesurfer.on('seeking', function(e) {
      wavesurfer.play()
    })

    const file = await sample.value.fileHandle.getFile()
    wavesurfer.loadBlob(file)
  }
})

watch(sample, (newSample, oldSample) => {
  if (newSample) {
    newSample.fileHandle.getFile().then(file => {
      wavesurfer.loadBlob(file)
    })
  }
})
</script>