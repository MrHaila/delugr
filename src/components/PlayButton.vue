<template lang="pug">
button(
  type="button"
  @click="isPlaying ? stopSample() : playSample()"
  class="inline-flex justify-center items-center px-1 py-1 rounded-md hover:shadow-sm hover:text-white select-none text-cyan-500 hover:bg-cyan-500 focus:outline-none ring-1 ring-cyan-500"
)
  PlayIcon(v-show="!isPlaying" :class="large ? 'w-4' : 'w-2'")
  PauseIcon(v-show="isPlaying" :class="large ? 'w-4' : 'w-2'")
</template>

<script lang="ts" setup>
import { PlayIcon, PauseIcon } from '@heroicons/vue/20/solid'
import { computed, onUnmounted, ref } from 'vue'
import { useStore } from '../deluge/files'

interface Props {
  id: Number
  large?: Boolean
}

const props = defineProps<Props>()

const store = useStore()

const sample = computed(() => props.id ? store.samples.find(sample => sample.id === props.id) : null)

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
