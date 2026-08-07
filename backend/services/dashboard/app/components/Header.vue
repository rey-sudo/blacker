<template>
  <div class="header">
    <div class="header__left gap-2 flex items-center h-[inherit]">
      <Tabs />
      <AddTabButton />
    </div>

    <div class="header__right gap-4 flex items-center h-[inherit]">
      <HeaderThemeButton />
      <HeaderSettingsButton />
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
  height: var(--header-height);
  grid-template-columns: 1fr auto;
  background: var(--header-background);
  padding-top: initial;
  padding-bottom: initial;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
