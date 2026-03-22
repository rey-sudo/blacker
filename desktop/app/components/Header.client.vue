<template>
  <div class="header">
    <div class="header__left">
      <TabSelector />
      <TabAdd />
    </div>

    <div class="header__right">
      <HeaderThemeButton />
      <HeaderSettingsButton />
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
  background: var(--bg);
  box-sizing: border-box;
  height: var(--header-height);
  grid-template-columns: 1fr auto;
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
}
</style>
