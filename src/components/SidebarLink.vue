<template lang="pug">
router-link(:to="url" :class="[route.path.includes(variant) ? 'bg-gray-900 text-white ' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-50 border border-gray-700', 'flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg']")
  span(v-if="variant === 'songs'")
    span.sr-only Songs
    MusicNoteIcon(aria-hidden="true").h-6.w-6
  span(v-else-if="variant === 'synths'")
    span.sr-only Songs
    AdjustmentsIcon(aria-hidden="true").h-6.w-6
  span(v-else-if="variant === 'kits'")
    span.sr-only Songs
    ArchiveIcon(aria-hidden="true").h-6.w-6
  span(v-else-if="variant === 'samples'")
    span.sr-only Songs
    MicrophoneIcon(aria-hidden="true").h-6.w-6
  span(v-else) {{ variant }}
</template>

<script lang="ts" setup>
import { MusicNoteIcon, ArchiveIcon, AdjustmentsIcon, MicrophoneIcon } from '@heroicons/vue/solid'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const props = defineProps({
  variant: {
    type: String,
    default: 'songs'
  }
})

const url = computed(() => {
  return `/${props.variant}`
})
</script>