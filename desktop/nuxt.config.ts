export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/theme.css", "~/assets/css/main.css"],
  ui: {
    colorMode: true,
  },
  modules: [["@pinia/nuxt", { autoImports: ["defineStore"] }], "@nuxt/ui"],
});
