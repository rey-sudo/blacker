<template>
  <div class="header">
    <div class="header__left">
      <TabSelector />
      <TabAdd />
    </div>

    <div class="header__right">
      <HeaderAvatar />
      <HeaderThemeButton />
      <HeaderSettingsButton style="margin-left: auto" />
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
  padding-right: 0.5rem;
}
</style>
