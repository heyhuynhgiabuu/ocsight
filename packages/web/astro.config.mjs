import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import htmx from 'astro-htmx'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import node from '@astrojs/node'
import starlight from '@astrojs/starlight'
import sitemap from '@astrojs/sitemap'
import compress from 'astro-compress'

export default defineConfig({
  site: 'https://ocsight.dev',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  redirects: {
    '/docs/cli-commands': '/docs/cli/',
    '/docs/cli-config': '/docs/cli/',
    '/docs/mcp-overview': '/docs/mcp/',
    '/docs/api-reference': '/docs/reference/architecture',
    '/docs/configuration': '/docs/guides/usage#configuration'
  },
  markdown: {
    remarkPlugins: [],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  },
  integrations: [
    starlight({
      title: 'Ocsight Docs',
      description: 'OpenCode ecosystem observability platform documentation',
      customCss: [
        'src/styles/starlight.css',
        'src/styles/brutalist.css',
        'src/styles/tokens.css'
      ],
      components: {
        // Override Starlight's default header with our custom brutalist header
        Header: 'src/components/base/CustomHeader.astro',
        // Override the site title component for consistent branding
        SiteTitle: 'src/components/base/SiteTitle.astro'
      },
      editLink: {
        baseUrl: 'https://github.com/opencode-ai/ocsight/edit/main/packages/web/src/content/docs/'
      },
      lastUpdated: true,
      sidebar: [
        {
          label: 'CLI Commands',
          autogenerate: {
            directory: 'cli/commands',
            collapsed: true
          },
          badge: {
            text: 'Commands',
            variant: 'tip'
          }
        }
      ]
    }),
    mdx(),
    htmx(),
    react(),
    tailwind({
      applyBaseStyles: false,
      config: {
        applyBaseStyles: false
      }
    }),
    sitemap(),
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      SVG: true,
      Image: true
    })
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  devToolbar: { enabled: false },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['astro', 'react', 'react-dom'],
            ui: ['clsx', 'tailwind-merge'],
            code: ['expressive-code']
          }
        }
      }
    }
  }
})
