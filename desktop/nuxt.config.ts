export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/styles.css", "primeicons/primeicons.css"],
  modules: [
    ["@primevue/nuxt-module", {}],
    ["@pinia/nuxt", { autoImports: ["defineStore"] }],
  ],

  primevue: {
    importTheme: { from: "~/themes/index.js" },
    options: {
      ripple: true,
      inputStyle: "outlined",
    },
    components: {
      include: ["Button", "DataTable"],
    },
  },
});
