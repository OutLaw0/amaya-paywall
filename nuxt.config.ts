export default defineNuxtConfig({
  compatibilityDate: '2026-10-13',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: { supabaseUrl: '', supabaseSecretKey: '' },
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Amaya — полный мир игры',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#FAF8FF' },
        { name: 'description', content: 'Откройте полный мир Amaya. Демонстрация тестовой покупки без списания денег.' },
      ],
    },
  },
  routeRules: {
    '/api/**': { headers: { 'cache-control': 'no-store' } },
  },
})
