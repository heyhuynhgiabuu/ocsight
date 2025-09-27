import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),

  features: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      description: z.string(),
      category: z
        .enum(["analysis", "export", "server", "integration", "ui"])
        .default("analysis"),
      status: z
        .enum(["stable", "beta", "alpha", "experimental", "deprecated"])
        .default("stable"),
      since: z.string().optional(),
      tags: z.array(z.string()).default([]),
    }),
  }),

  blog: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date(),
      updatedDate: z.date().optional(),
      heroImage: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
  }),

  changelog: defineCollection({
    type: "content",
    schema: z.object({
      version: z.string(),
      date: z.date(),
      type: z.enum(["major", "minor", "patch", "prerelease"]),
      summary: z.string(),
      breaking: z.array(z.string()).default([]),
      features: z.array(z.string()).default([]),
      fixes: z.array(z.string()).default([]),
      deprecated: z.array(z.string()).default([]),
    }),
  }),
};
