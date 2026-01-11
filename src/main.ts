import { t } from '@i18n'
import FloatingVue from 'floating-vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { makePrimeColorSet } from '@utils/makePrimeColorSet'

import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import App from '@ui/App.vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import FocusTrap from 'primevue/focustrap'
import KeyFilter from 'primevue/keyfilter'
import ToastService from 'primevue/toastservice'

import '@assets/fonts/index.scss'
import '@ui/icon/index.scss'
import '@ui/styles/common.scss'
import '@ui/styles/rewrites.scss'
import 'floating-vue/dist/style.css'
import 'primeicons/primeicons.css'
import 'virtual:iconify-icons.css'

console.log(t.consoleArt())

const app = createApp(App)

app.use(createPinia())

const primaryColorToken = __APP_IS_BETA__ ? 'orange' : 'emerald'

app.use(PrimeVue, {
  theme: {
    preset: definePreset(Aura, {
      semantic: {
        primary: makePrimeColorSet(primaryColorToken),
        colorScheme: { light: { content: { background: '{surface.50}' } } },
      },
    }),
  },
})
app.directive('focustrap', FocusTrap)
app.directive('keyfilter', KeyFilter)
app.use(ToastService)
app.use(ConfirmationService)

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
