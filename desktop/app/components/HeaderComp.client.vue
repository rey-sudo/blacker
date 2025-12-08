<template>
  <div class="header">
    <img class="logo" src="../assets/icons/logo.svg" alt="" />

    <div class="header-body">
      <div v-for="tab in tabsStore.tabs" :key="tab">
        <Tab :tabId="String(tab.id)" />
      </div>

      <CreateTab />
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
  display: flex;
  padding: 0 1rem;
  align-items: center;
  box-sizing: border-box;
  background: var(--nav-background);
  border-bottom: 1px solid var(--border-0);
}

.header-body {
  gap: 1rem;
  display: flex;
  align-items: center;
}
</style>
