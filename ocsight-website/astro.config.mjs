import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import htmx from 'astro-htmx'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import node from '@astrojs/node'
import starlight from '@astrojs/starlight'

export default defineConfig({
  integrations: [
    starlight({
      title: 'ocsight',
      description: 'OpenCode observability platform - see everything happening in your OpenCode development',
      logo: {
        src: './src/logo.svg',
        alt: 'ocsight logo'
      },
      social: [
        { icon: 'github', href: 'https://github.com/heyhuynhgiabuu/ocsight', label: 'GitHub' }
      ],
      sidebar: [
        {
          label: 'Intro',
          link: '/docs/'
        },
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', link: '/docs/installation' },
            { label: 'Quick Start', link: '/docs/quick-start' }
          ]
        },
        {
          label: 'Commands',
          items: [
            { label: 'analyze', link: '/docs/commands/analyze' },
            { label: 'stats', link: '/docs/commands/stats' },
            { label: 'export', link: '/docs/commands/export' },
            { label: 'mcp', link: '/docs/commands/mcp' }
          ]
        },
        {
          label: 'API Reference',
          items: [
            { label: 'MCP Tools', link: '/docs/api/mcp-tools' },
            { label: 'Data Format', link: '/docs/api/data-format' }
          ]
        }
      ],
      customCss: ['./src/styles/starlight.css']
    }),
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