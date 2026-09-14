// @ts-check
import { defineConfig } from 'astro/config';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeWrapTables from './src/plugins/rehype-wrap-tables.mjs';
import remarkCompare from './src/plugins/remark-compare.mjs';
import oslGrammar from './src/plugins/shiki-osl.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://wangsnowchen.github.io',
  markdown: {
    // ```compare 代码块 → AB 对比图。放在 remark 阶段，早于 Shiki 和 rehype-raw。
    remarkPlugins: [remarkCompare],
    // 明暗双主题高亮：Shiki 输出 --shiki-light / --shiki-dark 两套 CSS 变量，
    // 由 global.css 根据 [data-theme] 决定用哪一套，切换主题无需重新渲染。
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      wrap: false,
      // 注册自定义的 OSL 语法，让 ```osl 代码块能正确高亮
      langs: [oslGrammar],
    },
    rehypePlugins: [
      rehypeSlug,
      rehypeWrapTables,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: 'heading-anchor', ariaHidden: 'true', tabIndex: -1 },
          content: { type: 'text', value: '#' },
        },
      ],
    ],
  },
});
