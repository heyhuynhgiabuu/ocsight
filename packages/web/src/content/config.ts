import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

const docs = defineCollection({
  type: "content",
  schema: docsSchema(),
});

// Blog posts collection for future blog functionality
const blog = defineCollection({
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
});

// Changelog collection for version updates
const changelog = defineCollection({
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
});

export const collections = {
  docs,
  blog,
  changelog,
};
