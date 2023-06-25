<template lang="pug">
h-card(
  :subtitle="subtitle"
  )
  template(#title) {{ title }} #[h-badge {{ items.length }}]
  div(class="divide-y-2 divide-gray-200")
    div(
      v-for="item in props.items"
      class="py-2"
      )
      slot(name="item" :item="item")
        pre {{ item }}
  span(
    v-if="items.length === 0"
    class="text-gray-400 italic"
    ) {{ emptyLabel || 'No items.' }}
</template>

<script setup lang="ts" generic="T">
const props = defineProps<{
  title: string
  subtitle?: string
  items: T[]
  emptyLabel?: string
}>()
</script>
