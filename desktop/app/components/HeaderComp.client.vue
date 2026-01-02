<template>
  <div class="header">
    <div class="header-body">
      <Tab :tabId="String(tab.id)" v-for="tab in tabsStore.tabs" :key="tab" />

      <TabAdd />
    </div>

    <ColorModeButton />
    <HeaderSettingsButton style="margin-left: auto" />
  </div>
</template>

<script setup>
const tabsStore = useTabsStore();
</script>

<style lang="css" scoped>
.header {
  gap: 1rem;
  display: flex;
  padding: 0 1rem;
  align-items: center;
  box-sizing: border-box;
  height: var(--header-height);
  background: var(--nav-background);
  border-bottom: 1px solid var(--ui-border);
}

.header-body {
  gap: 1rem;
  display: flex;
  align-items: center;
  height: inherit;
}

.logo {
}
</style>
