import { createApp } from 'vue'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

import App from './App.vue'
import './index.css'

import Home from './views/Home.vue'
import Song from './views/Song.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/songs/:name', component: Song },
  ],
})

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
