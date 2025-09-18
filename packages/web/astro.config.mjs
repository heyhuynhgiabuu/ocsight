import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import htmx from 'astro-htmx'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import node from '@astrojs/node'

export default defineConfig({
  markdown: {
    remarkPlugins: []
  },
  integrations: [
    mdx(),
    htmx(),
    react(),
    tailwind({
      applyBaseStyles: false,
      config: {
        applyBaseStyles: false
      }
    })
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  devToolbar: { enabled: false },
  site: 'https://ocsight.dev'
})