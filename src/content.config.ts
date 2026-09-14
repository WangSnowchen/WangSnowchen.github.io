import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    /** 封面图，相对 public/ 的路径，如 /images/xxx.png */
    cover: z.string().optional(),
    /** 置顶 */
    featured: z.boolean().default(false),
  }),
});

/**
 * 独立页面（关于等）。用 Markdown 写正文，改内容不用碰 Astro 模板。
 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
  }),
});

export const collections = { posts, pages };
