<template lang="pug">
div(v-if="latest" class="shadow-sm rounded-sm p-5 space-y-3 backdrop-blur-md bg-white/30" data-testid="whats-new")
  div(class="flex items-baseline justify-between space-x-3")
    h3(class="font-bold") ✨ What's new
    span(class="text-xs text-gray-500") {{ formattedDate }}
  p(v-if="latest.title" class="font-semibold text-sm") {{ latest.title }}
  ul(class="list-disc pl-5 space-y-1 text-sm")
    li(v-for="bullet in latest.bullets" :key="bullet") {{ bullet }}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { DateTime } from 'luxon'
import { releaseNotes } from '../releaseNotes'

const latest = releaseNotes[0]
const formattedDate = computed(() => latest ? DateTime.fromISO(latest.date).toLocaleString(DateTime.DATE_MED) : '')
</script>
