import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

import App from './App.vue'
import './index.css'

import Home from './views/Home.vue'
import Songs from './views/Songs.vue'
import Synths from './views/Synths.vue'
import Kits from './views/Kits.vue'
import Samples from './views/Samples.vue'

import HCard from './components/HCard.vue'
import HButton from './components/HButton.vue'
import PageBase from './components/PageBase.vue'
import HBadge from './components/HBadge.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/songs/:name', component: Songs, props: true },
    { path: '/songs', component: Songs },
    { path: '/synths/:name', component: Synths, props: true },
    { path: '/synths', component: Synths },
    { path: '/kits/:name', component: Kits, props: true },
    { path: '/kits', component: Kits },
    { path: '/samples/:name', component: Samples, props: true },
    { path: '/samples', component: Samples },
  ],
})

createApp(App)
  .use(createPinia())
  .use(router)
  .component('HCard', HCard)
  .component('HButton', HButton)
  .component('PageBase', PageBase)
  .component('HBadge', HBadge)
  .mount('#app')
