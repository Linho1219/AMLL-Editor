import { createApp } from 'vue'
import { createPinia } from 'pinia'

import PrimeVue from 'primevue/config'
import FocusTrap from 'primevue/focustrap'
import KeyFilter from 'primevue/keyfilter'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import 'primeicons/primeicons.css'

import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'

import App from '@ui/App.vue'
import '@ui/common.scss'
import '@assets/fonts/index.scss'

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
app.directive('focustrap', FocusTrap)
app.directive('keyfilter', KeyFilter)
app.use(ToastService)

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

app.mount('#app')
