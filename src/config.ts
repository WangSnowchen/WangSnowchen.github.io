/**
 * 站点级配置。需要手填的东西集中在这里，避免散落到各个组件里。
 */

/**
 * giscus 评论（后端是 GitHub Discussions）。
 *
 * 为什么不直接写仓库名：giscus 要的是 GitHub 内部的全局 ID（node_id），
 * 不是 "owner/repo" 这种人类可读的名字。这两个 ID 只能从 giscus.app 生成：
 *
 *   1. 仓库 Settings → General → Features → 勾选 Discussions
 *   2. 在仓库里新建一个 Discussion 分类（或直接用 Announcements）
 *   3. 给仓库安装 giscus app：https://github.com/apps/giscus
 *   4. 打开 https://giscus.app，填入仓库名，选好分类
 *   5. 页面下方会生成一段配置，把里面的 data-repo-id 和 data-category-id 抄到下面
 *
 * 两项都填好之前，文章页不会渲染评论区（本地开发会显示一行提示，线上静默跳过），
 * 这样访客不会看到一个加载失败的评论框。
 */
export const giscus = {
  repo: 'WangSnowchen/WangSnowchen.github.io',
  repoId: 'R_kgDOLjigww',
  category: 'Announcements',
  categoryId: 'DIC_kwDOLjigw84DFmIb',

  /**
   * pathname：一个页面路径对应一个 discussion。
   * 改标题不会丢评论，但改 slug 会。本站 slug 是稳定文件名，所以选它。
   */
  mapping: 'pathname',

  reactionsEnabled: '1',
  /** 'top' 把输入框放在已有评论上方，'bottom' 放最下面 */
  inputPosition: 'bottom',
  lang: 'zh-CN',
} as const;

export const isGiscusConfigured = Boolean(giscus.repoId && giscus.categoryId);
