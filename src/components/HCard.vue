<template lang="pug">
div(class="bg-white shadow overflow-hidden sm:rounded-lg")
  //- Header
  div(class="px-4 py-5 sm:px-6")
    h3(class="text-lg leading-6 font-medium text-gray-900")
      slot(name="title") Placeholder Title
      p(class="mt-1 max-w-2xl text-sm text-gray-500") Lorem ipsum dolor sit amet.
  
  //- Body
  div(class="border-t border-gray-200 px-4 py-5 sm:p-0")
    slot
      div [EMPTY]
</template>