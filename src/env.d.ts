/// <reference types="vite/client" />

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    RouterLink: typeof import('vue-router')['RouterLink']
    RouterView: typeof import('vue-router')['RouterView']
    HBadge: typeof import('./components/HBadge.vue')
    HButton: typeof import('./components/HButton.vue')
    HCard: typeof import('./components/HCard.vue')
    HList: typeof import('./components/HList.vue')
    HListCard: typeof import('./components/HListCard.vue')
    HModal: typeof import('./components/HModal.vue')
    HTextField: typeof import('./components/HTextField.vue')
  }
}

export {}
