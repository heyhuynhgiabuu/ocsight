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
        src: './public/logo.svg',
        alt: 'ocsight logo'
      },
      social: [
        { icon: 'github', href: 'https://github.com/heyhuynhgiabuu/ocsight', label: 'GitHub' }
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/docs/introduction' },
            { label: 'Installation', link: '/docs/installation' },
            { label: 'Quick Start', link: '/docs/quick-start' },
            { label: 'Getting Started', link: '/docs/getting-started' }
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
        },
        {
          label: 'Additional Resources',
          items: [
            { label: 'Architecture', link: '/docs/architecture' },
            { label: 'Usage', link: '/docs/usage' },
            { label: 'MCP Integration', link: '/docs/mcp' }
          ]
        }
      ],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4
      },
      customCss: ['./src/styles/starlight.css'],
      pagefind: true
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