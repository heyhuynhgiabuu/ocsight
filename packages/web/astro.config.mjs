// @ts-check
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import cloudflare from "@astrojs/cloudflare"
import config from "./config.mjs"
import { rehypeHeadingIds } from "@astrojs/markdown-remark"
import rehypeAutolinkHeadings from "rehype-autolink-headings"

// https://astro.build/config
export default defineConfig({
  site: config.url,
  base: "/docs",
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  devToolbar: {
    enabled: false,
  },
  server: {
    host: "0.0.0.0",
  },
  markdown: {
    rehypePlugins: [rehypeHeadingIds, [rehypeAutolinkHeadings, { behavior: "wrap" }]],
  },
  build: {},
  integrations: [
    starlight({
      title: "ocsight",
      lastUpdated: true,
      expressiveCode: { themes: ["kanagawa-lotus", "kanagawa-wave"] },
      social: [
        { icon: "github", label: "GitHub", href: config.github },
        { icon: "npm", label: "npm", href: config.npm },
      ],
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/docs/favicon.svg",
          },
        },
      ],
      pagination: false,
      markdown: {
        headingLinks: false,
      },
      customCss: ["./src/styles/custom.css"],
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      sidebar: [
        "",
        "intro",

        {
          label: "Commands",
          items: ["cli", "cli-commands", "cli-summary", "cli-sessions", "cli-costs", "cli-export"],
        },

        {
          label: "Reference",
          items: ["usage", "data-format", "architecture", "api"],
        }
      ],
    components: {
        Hero: "./src/components/Hero.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        Footer: "./src/components/Footer.astro",
      },
    }),
  ],
  redirects: {
    "/github": config.github,
    "/npm": config.npm,
  },
})