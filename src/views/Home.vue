<template lang="pug">
h1.font-bold.text-4xl Songs

h-card
  template(#title) Songs

  span No content
</template>

<script lang="ts" setup>
import { DateTime } from 'luxon'
import { useStore } from '../store'

const store = useStore()
</script>