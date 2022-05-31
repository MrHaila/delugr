<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="flex-1 h-full overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sample" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Sample not found! {{ store.samples.length }} samples in total

  div(v-else class="space-y-3")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl Sample: {{ sample.name.slice(0, -4) }}
        p(class="text-gray-400 text-sm") {{ sample.path }}
      div(class="text-right text-sm mt-3")
        p Last modified: {{ DateTime.fromMillis(sample.lastModified).toFormat('yyyy-MM-dd') }}
    
    div File size: {{ sample.size }} bytes

    h-button(@click="isPlaying ? stopSample() : playSample()") {{ isPlaying ? 'Stop sample' : 'Play sample' }}

    div(class="flex space-x-3")
      h-card(class="max-w-3xl flex-1")
        template(#title) Usage
        div(v-if="sample.usage.total" class="flex justify-between space-x-3")
          div(class="flex-1")
            h2(class="font-semibold") Songs #[h-badge {{ Object.keys(sample.usage.songs).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(details, key) in sample.usage.songs" :key="key")
                router-link(:to="'/songs/' + key") {{ key }}
                span(class="text-xs text-gray-400")  via {{ details.instrumentName }}
          
          div(class="flex-1")
            h2(class="font-semibold") Kits #[h-badge {{ Object.keys(sample.usage.kits).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(details, key) in sample.usage.kits" :key="key")
                router-link(:to="'/kits/' + key") {{ key }}
                span(class="text-xs text-gray-400")  via {{ details.instrumentName }}
          
          div(class="flex-1")
            h2(class="font-semibold") Synths #[h-badge {{ Object.keys(sample.usage.sounds).length }}]
            div(class="space-y-2 divide-y divide-gray-200")
              div(v-for="(details, key) in sample.usage.sounds" :key="key")
                router-link(:to="'/synths/' + key") {{ key }}
        
        div(v-else class="italic text-gray-400") Not used in any songs, kits or synths.
</template>

<script lang="ts" setup>
import { computed } from '@vue/reactivity'
import { DateTime } from 'luxon'
import { onUnmounted, ref } from 'vue'
import { useStore } from '../deluge/files'

const store = useStore()

const props = defineProps([
  'name'
])


const idAsNumber = computed(() => parseInt(props.name))
const sample = computed(() => props.name ? store.samples.find(sample => sample.id === idAsNumber.value) : null)

//- Audio playback shenanigans
let audioContext: AudioContext | null = null
let audioSource: AudioBufferSourceNode | null = null
const isPlaying = ref(false)

async function playSample() {
  if (!sample.value) return

  if (!audioContext || !audioSource) {
    audioContext = new AudioContext()
    audioSource = audioContext.createBufferSource()
    audioSource.connect(audioContext.destination)
    const file = await sample.value.fileHandle.getFile()
    const buffer = await file.arrayBuffer()
    const audioData = await audioContext.decodeAudioData(buffer)
    audioSource.buffer = audioData
    audioSource.start()
    audioSource.onended = () => stopSample()
    isPlaying.value = true
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
}

function stopSample() {
  audioSource?.stop()
  audioSource?.disconnect()
  audioSource = null
  isPlaying.value = false
}

onUnmounted(() => stopSample())
</script>