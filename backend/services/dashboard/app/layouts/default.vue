<template>
  <div class="layout">
    <Footer />
    <USeparator />
    <Header />

    <USeparator />
    <NuxtPage />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  height: 100dvh;
  grid-template-rows: auto auto auto auto 1fr;
  background: var(--main-background);
}

.layout > * {
  min-height: 0;
}
</style>
