<template>
  <div class="layout">
    <HeaderComp />
    <main class="content">
      <NuxtPage :key="$route.fullPath" />
    </main>
    <FooterComp />
  </div>
</template>

<script setup></script>

<style scoped>
.layout {
  background: var(--background-0);
  box-sizing: border-box;
  height: 100vh;
  width: 100%;
  padding: 0;
}

.content {
  flex: 1;
}
</style>
