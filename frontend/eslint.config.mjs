// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // App-level components (Navbar, ...) and shadcn-vue primitives are commonly
    // single-word; their props rely on TS types rather than runtime defaults.
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'off',
  },
})
