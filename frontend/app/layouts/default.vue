<template>
  <!--
    Wrapper AND body are intentionally transparent: the base dark color lives on
    <html> (see tailwind.css @layer base) so the fixed -z-10 SceneBackground canvas
    paints above the html background and behind the page content. Do NOT add a
    background or a stacking context (z-index, transform, isolation) to this wrapper
    (BuildIntro's root) or to <body>, or the canvas would be hidden again.
  -->
  <BuildIntro>
    <SceneBackground />
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </BuildIntro>
</template>
