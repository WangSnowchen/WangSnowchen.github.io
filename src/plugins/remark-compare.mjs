import { readFileSync } from 'node:fs';

import { parseCompareBlock, describeCompareProblem, renderCompare } from './compare-core.mjs';

/**
 * 把 ```compare 代码块替换成对比图的实际结构。
 *
 * 用 remark 而不是 rehype：remark 跑在整条管线最前面，此时
 *   - 代码块还是原始的 code 节点，直接读 node.value 就行，不用去 hast 里翻文本节点；
 *   - 后面 Shiki 还没介入，不会看到一个不认识的 language-compare 而报警告。
 */
export default function remarkCompare() {
  return (tree, file) => {
    walk(tree, (node, index, parent) => {
      if (node.type !== 'code' || node.lang !== 'compare') return;

      const parsed = parseCompareBlock(node.value);
      const where = describeLocation(file, node);

      if (parsed.problems.length || parsed.images.length !== 2) {
        throw new Error(
          [`${where} 的 \`\`\`compare 代码块格式不对。`, '', ...describeCompareProblem(parsed)].join(
            '\n'
          )
        );
      }

      // 换成原始 HTML 节点，交给 Astro 的 rehype-raw 解析进文档树
      parent.children[index] = { type: 'html', value: renderCompare(parsed) };
    });
  };
}

/**
 * 报错要指到原文的真实行号，但 remark 拿到的 `file.value` 是 Astro 剥掉 frontmatter
 * 之后的正文，`node.position` 里的行号也是相对正文的 —— 直接报出去会指错行
 * （实测差了 6 行，正是 frontmatter 加它后面那个空行）。
 *
 * 所以拿正文第一行回原文里定位，反推出被剥掉了多少行。定位不到就只报文件名，
 * 报一个错的行号比不报更糟。
 */
function describeLocation(file, node) {
  const path = file?.path ?? '(未知文件)';
  const bodyLine = node.position?.start?.line;
  if (!bodyLine) return path;

  const offset = strippedLineCount(file);
  return offset === null ? path : `${path}:${bodyLine + offset}`;
}

const offsetCache = new Map();

function strippedLineCount(file) {
  const path = file?.path;
  if (!path) return null;
  if (offsetCache.has(path)) return offsetCache.get(path);

  let offset = null;
  try {
    const rawLines = readFileSync(path, 'utf8').split('\n');
    const firstBodyLine = String(file.value ?? '')
      .split('\n')
      .find((line) => line.trim() !== '');

    if (firstBodyLine) {
      const index = rawLines.indexOf(firstBodyLine);
      if (index >= 0) offset = index;
    }
  } catch {
    // 读不到原文（虚拟路径等）就放弃行号，只报文件名
    offset = null;
  }

  offsetCache.set(path, offset);
  return offset;
}

/**
 * 手写一个树遍历，省掉 unist-util-visit 这个依赖 —— 这里只需要最基本的「找到节点、能替换」。
 */
function walk(node, visit) {
  if (!node || !Array.isArray(node.children)) return;
  node.children.forEach((child, index) => {
    visit(child, index, node);
    walk(child, visit);
  });
}
