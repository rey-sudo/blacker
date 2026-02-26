<template>
  <div class="header">
    <div class="header__left">
      <TabSelector />
      <TabAdd />
    </div>

    <div class="header__right">
      <USeparator orientation="vertical" class="h-6 pl-0 pr-0" />
      <HeaderThemeButton />
      <HeaderSettingsButton style="margin-left: auto" />
      <HeaderAvatar />
    </div>
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.header {
  gap: 1rem;
  display: grid;
  align-items: center;
  box-sizing: border-box;
  grid-template-columns: 1fr auto;
  height: var(--header-height);
  background: var(--nav-background);
  padding: var(--tab-content-padding);
  padding-top: initial;
  padding-bottom: initial;
}

.header__left {
  gap: 1rem;
  height: inherit;
  display: flex;
  align-items: center;
}

.header__right {
  gap: 1rem;
  display: flex;
  align-items: center;
  padding-right: 1rem;
}
</style>
