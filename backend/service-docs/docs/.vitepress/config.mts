import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Blacker docs",
  description: "Blacker docs",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "Microservices",
        items: [
          { text: "⚙️ service-ingest", link: "/service-ingest" },
          { text: "⚙️ service-ingest-base", link: "/service-ingest-base" },
          { text: "⚙️ service-ingest-api", link: "/service-ingest-api" },
          { text: "⚙️ service-feed", link: "/service-feed" },
          { text: "⚙️ service-backtest", link: "/service-backtest" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
