<template lang="pug">
h1 SONG VIEW - {{ route.params.name}}
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'

const route = useRoute()

</script>