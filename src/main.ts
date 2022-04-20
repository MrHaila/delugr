import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

import App from './App.vue'
import './index.css'

import Home from './views/Home.vue'
import Song from './views/Song.vue'

import HCard from './components/HCard.vue'
import HButton from './components/HButton.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/songs/:name', component: Song },
    { path: '/songs', component: Home },
    { path: '/synths', component: Home },
    { path: '/kits', component: Home },
    { path: '/samples', component: Home },
  ],
})

createApp(App)
  .use(createPinia())
  .use(router)
  .component('HCard', HCard)
  .component('HButton', HButton)
  .mount('#app')
