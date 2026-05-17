<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup>
const appConfig = useAppConfig();

useHead({
  title: appConfig.title,
  meta: [
    { name: "description", content: "red" },
    { property: "og:title", content: "red" },
  ]
});
</script>
