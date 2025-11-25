import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import { definePreset } from '@primeuix/themes'

import FloatingVue from 'floating-vue'

import 'floating-vue/dist/style.css'
import 'primeicons/primeicons.css'
import '@/styles/common.scss'
import '@/styles/fonts/index.scss'

import FocusTrap from 'primevue/focustrap'

const app = createApp(App)

app.use(createPinia())
app.use(PrimeVue, {
  theme: {
    preset: definePreset(Aura, {
      semantic: {
        colorScheme: {
          light: {
            content: {
              background: '{surface.50}',
            },
          },
        },
      },
    }),
  },
})

app.use(FloatingVue, {
  themes: {
    tooltip: {
      triggers: ['hover', 'focus'],
      delay: {
        show: 750,
        hide: 0,
      },
    },
  },
})

app.directive('focustrap', FocusTrap)

app.mount('#app')
