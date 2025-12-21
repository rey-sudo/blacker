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
  display: grid;
  height: 100vh;          
  width: 100%;
  grid-template-rows: auto 1fr auto; 
  background: var(--main-background);
  box-sizing: border-box;
}

.content {
  min-height: 0;           
  display: flex;
  flex-direction: column;  
  justify-content: center;
  align-items: stretch;   
}
</style>
