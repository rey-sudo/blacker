<template>
  <div class="header">
    <img class="logo" src="../assets/icons/logo.svg" alt="" />

    <div class="header-body">
      <div v-for="tab in tabsStore.tabs" :key="tab">
        <SymbolSelector :tabId="String(tab.id)" />
      </div>

      <addTab />
    </div>
  </div>
</template>

<script setup>
const tabsStore = useTabsStore();
</script>

<style lang="css" scoped>
.header {
  gap: 1rem;
  height: 3rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  background: var(--background-1);
  border-bottom: 1px solid var(--border-0);
}

.header-body {
  gap: 1rem;
  display: flex;
  align-items: center;
}
</style>
