import { defineCollection, z } from "astro:content";

const docsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
    category: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  docs: docsCollection,
};
