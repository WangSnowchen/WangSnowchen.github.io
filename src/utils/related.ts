import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/**
 * 按标签重合度挑相关文章，最多 max 篇。
 *
 * 重合数相同时日期新的排前面；一个标签都不重合就不推 —— 宁缺毋滥，
 * 硬凑出来的「相关」比没有更让人失望。
 *
 * 注意这个函数必须待在 .astro 文件外面：Astro 的编译器只保留模板里引用到的
 * 前端声明，只被 getStaticPaths 用到的辅助函数会被当成死代码摇掉，
 * 构建时报 "xxx is not defined"。import 进来的不受影响。
 */
export function findRelated(current: Post, posts: Post[], max = 3): Post[] {
  const own = new Set(current.data.tags);
  if (own.size === 0) return [];

  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => ({
      post,
      shared: post.data.tags.filter((tag) => own.has(tag)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort(
      (a, b) => b.shared - a.shared || b.post.data.date.valueOf() - a.post.data.date.valueOf()
    )
    .slice(0, max)
    .map((entry) => entry.post);
}
