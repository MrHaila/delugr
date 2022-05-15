<template lang="pug">
page-base
  div(class="space-y-3 max-w-lg")
    h1.font-bold.text-4xl Home Page TBD
    p This thing is very much WIP. Use the buttons on the left to browse your Deluge content. The plan is to add enough features to effectively manage your Deluge assets.
    p(class="text-gray-400") There are sure to be obvious bugs and missing stuff. Feel free to report them in the repo and maybe even help out by leaving a PR!
</template>

<script lang="ts" setup>
import { DateTime } from 'luxon'
import { useStore } from '../deluge/files'

const store = useStore()
</script>