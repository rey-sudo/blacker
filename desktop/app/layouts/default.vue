<template>
  <div class="layout">
    <HeaderComp />
    <main class="content">
      <NuxtPage :key="$route.fullPath" />
    </main>
  </div>
</template>

<script setup>


</script>

<style scoped>
.layout {
  background: var(--background-0);
  width: 100%;
  height: 100vh;
  padding: 1%;
  box-sizing: border-box;
}

.content {
  flex: 1;
}
</style>