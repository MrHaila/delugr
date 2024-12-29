<template lang="pug">
div
  h2(class="font-bold text-gray-500") Technical Details #[a(@click="toggleTechnicalDetailsUi" class="font-normal text-xs cursor-pointer") {{ isTechnicalDetailsUiEnabled ? 'Hide' : 'Show' }}]
  div(v-if="isTechnicalDetailsUiEnabled")
    div(class="text-sm mb-4 text-gray-500")
      p The Deluge saves things into XML files. You could open them up in a normal text editor and edit the data manually if you know what you are doing.
      p Here's a dump of what I've managed to parse so far:

    div(class="flex space-x-3 w-full" style="font-size: 60%;")
      div(class="rounded bg-gray-100 p-3 font-mono w-full overflow-x-auto text-gray-600")
        h3(class="font-bold") {{ leftTitle }}
        slot(name="left")

      div(class="rounded bg-gray-100 p-3 font-mono w-full overflow-x-auto text-gray-600")
        h3(class="font-bold") {{ rightTitle }}
        slot(name="right")
</template>

<script setup lang="ts">
import { useTechnicalDetailsUi } from '../composables/useTechnicalDetailsUi'

const { isTechnicalDetailsUiEnabled, toggleTechnicalDetailsUi } = useTechnicalDetailsUi()

const props = defineProps<{
  leftTitle: string
  rightTitle: string
}>()
</script>