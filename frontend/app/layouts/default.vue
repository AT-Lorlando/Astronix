<template>
  <div class="relative flex min-h-screen flex-col text-foreground">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
