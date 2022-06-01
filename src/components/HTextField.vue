<template lang="pug">
div
  label(for="email" class="block text-sm font-medium text-gray-700") Email
  div(class="mt-1 relative rounded-md shadow-sm")
    input(
      type="email"
      name="email"
      id="email"
      class="block w-full pr-10 border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md" placeholder="you@example.com" value="adamwathan" aria-invalid="true" aria-describedby="email-error"
      )
    div(class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none")
      ExclamationCircleIcon(class="h-5 w-5 text-red-500" aria-hidden="true")

  p(class="mt-2 text-sm text-red-600" id="email-error") Your password must be less than 4 characters.
</template>

<script lang="ts" setup>
import { ExclamationCircleIcon } from '@heroicons/vue/solid'

/*
  TODO:
  - Dynamic labels
  - Validation
  - Error messages
  - v-model
*/

</script>
