/// <reference types="vite/client" />

import { RouterLink, RouterView } from 'vue-router'

import HBadge from './components/HBadge.vue'
import HButton from './components/HButton.vue'
import HCard from './components/HCard.vue'
import HList from './components/HList.vue'
import HListCard from './components/HListCard.vue'
import HModal from './components/HModal.vue'
import HTextField from './components/HTextField.vue'

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    RouterLink: typeof RouterLink
    RouterView: typeof RouterView
    HBadge: typeof HBadge
    HButton: typeof HButton
    HCard: typeof HCard
    HList: typeof HList
    HListCard: typeof HListCard
    HModal: typeof HModal
    HTextField: typeof HTextField
  }
}

export {}
