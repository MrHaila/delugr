<template lang="pug">
page-base
  h1.font-bold.text-4xl THE DELUGR

  h-card
    template(#title) Songs

    span No content
</template>

<script lang="ts" setup>
import { DateTime } from 'luxon'
import { useStore } from '../store'

const store = useStore()
</script>