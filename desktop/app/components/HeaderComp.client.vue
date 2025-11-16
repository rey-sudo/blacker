<template>
  <div class="header">
    <img class="logo" src="../assets/icons/logo.svg" alt="" />

    <div class="header-body">
      <div v-for="n in tabsStore.count" :key="n">
        <SymbolSelector :tabId="String(n)"/>
      </div>
      <Button icon="pi pi-plus" size="small" v-ripple />
    </div>
  </div>
</template>

<script setup>
const tabsStore = useTabsStore();

</script>

<style lang="css" scoped>
.header {
  gap: 1rem;
  height: 4rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  border-bottom: 1px solid var(--border-0);
}

.header-body {
  gap: 1rem;
  display: flex;
  align-items: center;
}
</style>
