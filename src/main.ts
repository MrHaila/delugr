import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'
import './index.css'

import Home from './views/Home.vue'
import SongList from './views/SongList.vue'
import SongDetails from './views/SongDetails.vue'
import SongsOverview from './views/SongsOverview.vue'
import SynthList from './views/SynthList.vue'
import SynthDetails from './views/SynthDetails.vue'
import SynthsOverview from './views/SynthsOverview.vue'
import KitList from './views/KitList.vue'
import KitDetails from './views/KitDetails.vue'
import KitsOverview from './views/KitsOverview.vue'
import SampleList from './views/SampleList.vue'
import SampleDetails from './views/SampleDetails.vue'
import SamplesOverview from './views/SamplesOverview.vue'

import HCard from './components/HCard.vue'
import HButton from './components/HButton.vue'
import NavigationList from './components/NavigationList.vue'
import HBadge from './components/HBadge.vue'
import HModal from './components/HModal.vue'
import HList from './components/HList.vue'
import HListCard from './components/HListCard.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/songs', component: SongList, children: [
      { path: ':name', component: SongDetails, props: true },
      { path: '', component: SongsOverview },
    ]},
    {
      path: '/synths', component: SynthList, children: [
        { path: ':name', component: SynthDetails, props: true },
        { path: '', component: SynthsOverview },
      ]
    },
    {
      path: '/kits', component: KitList, children: [
        { path: ':name', component: KitDetails, props: true },
        { path: '', component: KitsOverview },
      ]
    },
    {
      path: '/samples', component: SampleList, children: [
        { path: ':name', component: SampleDetails, props: true },
        { path: '', component: SamplesOverview },
      ]
    },
  ],
})

createApp(App)
  .use(router)
  .component('HCard', HCard)
  .component('HButton', HButton)
  .component('NavigationList', NavigationList)
  .component('HBadge', HBadge)
  .component('HModal', HModal)
  .component('HList', HList)
  .component('HListCard', HListCard)
  .mount('#app')
