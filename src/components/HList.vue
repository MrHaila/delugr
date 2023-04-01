<template lang="pug">
h2(class="font-semibold") {{ title }} #[h-badge {{ items.length }}]
div(class="divide-y divide-gray-200")
  div(
    v-for="item in items"
    class="py-2"
    )
    slot(name="item" :item="item")
      pre {{ item }}
</template>

<script lang="ts" setup>import { computed } from 'vue';

const props = defineProps<{
  title: string
  list?: any[]
  object?: { [key: string]: any }
}>()

const items = computed(() => {
  if (props.list) {
    return props.list
  } else if (props.object) {
    return Object.entries(props.object).map(([key, value]) => ({ key, value }))
  } else {
    return []
  }
})
</script>