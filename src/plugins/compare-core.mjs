/**
 * ```compare 代码块的解析与渲染。
 *
 * 语法刻意就用普通 markdown 图片语法，理由是编辑器里能正常预览图片、
 * 写错了也一眼看得出来，不用记新的一套参数名：
 *
 *   ```compare
 *   ![修改前](/images/before.png)
 *   ![修改后](/images/after.png)
 *   ```
 *
 * 第一张 = 左侧（底层），第二张 = 右侧（滑块上层）。
 * alt 文字会变成图上的标签，留空就只显示图。
 *
 * 解析逻辑单独放这里，构建插件和 scripts/check-content.mjs 共用，
 * 免得两处规则各写一遍、慢慢跑偏。
 */

/** 匹配一整行 markdown 图片：![alt](src) 或 ![alt](src "title") */
const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["']([^"']*)["'])?\s*\)$/;

/**
 * @param {string} value 代码块的原始文本
 * @returns {{ images: {alt: string, src: string, title: string}[], problems: {index: number, text: string}[] }}
 */
export function parseCompareBlock(value) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  const images = [];
  const problems = [];

  lines.forEach((line, index) => {
    const match = line.match(IMAGE_LINE_RE);
    if (match) {
      images.push({ alt: match[1].trim(), src: match[2], title: match[3] ?? '' });
    } else {
      problems.push({ index: index + 1, text: line });
    }
  });

  return { images, problems };
}

/**
 * 把解析结果变成一段人能直接照做的说明。
 *
 * 返回行数组而不是拼好的字符串，是因为两个调用方缩进层级不同：
 * 构建插件直接打出来，检查脚本要嵌在「文件:行号」下面再多缩一层。
 *
 * @returns {string[]}
 */
export function describeCompareProblem({ images, problems }) {
  const lines = [
    '正确写法是代码块里正好两行 markdown 图片（第一张在左，第二张在右）：',
    '',
    '  ```compare',
    '  ![修改前](/images/before.png)',
    '  ![修改后](/images/after.png)',
    '  ```',
  ];

  if (problems.length) {
    lines.push('', '下面这些行解析不了：');
    for (const p of problems) {
      lines.push(`  第 ${p.index} 行  ${p.text}`);
    }
    lines.push('', '每行都要是完整的 ![](路径)，前后不要有多余文字。');
  } else if (images.length !== 2) {
    lines.push('', `当前放了 ${images.length} 张图，需要正好 2 张。`);
  }

  return lines;
}

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);

/**
 * 生成对比图的 HTML。用 figure 包住，语义上是一组对照内容而不是两张独立插图。
 */
export function renderCompare({ images }) {
  const [before, after] = images;

  const label = (image, side) =>
    image.alt
      ? `\n    <span class="compare__tag compare__tag--${side}">${escapeHtml(image.alt)}</span>`
      : '';

  const alt = (image, fallback) => escapeHtml(image.alt || fallback);

  return `<figure class="compare" data-compare>
  <div class="compare__stage">
    <img class="compare__img compare__img--before" src="${escapeHtml(before.src)}" alt="${alt(before, '对比图（前）')}" loading="lazy" decoding="async" />
    <div class="compare__overlay">
      <img class="compare__img compare__img--after" src="${escapeHtml(after.src)}" alt="${alt(after, '对比图（后）')}" loading="lazy" decoding="async" />
    </div>${label(before, 'before')}${label(after, 'after')}
    <div class="compare__handle" role="slider" tabindex="0" aria-label="拖动对比修改前后" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
      <span class="compare__grip" aria-hidden="true"></span>
    </div>
  </div>
</figure>`;
}
