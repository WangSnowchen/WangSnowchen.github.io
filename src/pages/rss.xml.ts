import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * RSS 订阅源，产物在 /rss.xml。
 *
 * 这里只给摘要 + 链接，不发全文。原因不是偷懒：正文里的图片写的是
 * /images/xxx.png 这种站内绝对路径，@astrojs/rss 不会把它们改写成完整 URL，
 * 发全文的话在阅读器里全是裂图。要发全文得先在这里把图片路径改写成
 * new URL(path, context.site)，等真有读者反馈需要再说。
 */
export async function GET(context: APIContext) {
  const posts = (await getCollection('posts')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'CGWiKi',
    description: '记录技术实践中的推导过程、踩过的坑，以及最后是怎么解决的。',
    // astro.config.mjs 里配了 site，正常情况下不会是 undefined
    site: context.site ?? 'https://wangsnowchen.github.io',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/post/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-cn</language>',
  });
}
