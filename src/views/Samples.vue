<template lang="pug">
page-base
  h1.font-bold.text-2xl Samples TBD
  p(v-if="store.samples") Spoilers: you have {{ Object.keys(store.samples).length }} samples!
</template>

<script lang="ts" setup>
import { DateTime } from 'luxon'
import { useStore } from '../store'

const store = useStore()
</script>