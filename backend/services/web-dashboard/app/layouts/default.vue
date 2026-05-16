<template>
  <div class="layout">
    <Header />

    <NuxtPage />

    <Footer />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  min-height: 100dvh;
  grid-template-rows: auto 1fr auto;
  background: var(--main-background);
}
</style>
