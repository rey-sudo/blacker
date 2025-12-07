export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: [
    "~/assets/css/main.css",
  ],
  modules: [
    ["@primevue/nuxt-module", {}],
    ["@pinia/nuxt", { autoImports: ["defineStore"] }],
    '@nuxt/ui'
  ]
});
