<template>
  <!--
    Wrapper is intentionally transparent (no bg-*): the fixed -z-10 SceneBackground
    canvas sits above body's bg-background and behind the page content. Avoid adding
    a background or a z-index/stacking-context (transform, isolation) to this wrapper
    or it would hide the canvas.
  -->
  <div class="relative flex min-h-screen flex-col text-foreground">
    <SceneBackground />
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
