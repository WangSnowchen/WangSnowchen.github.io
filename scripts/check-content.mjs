#!/usr/bin/env node
/**
 * 构建前的内容检查。
 *
 * 存在的意义：写文章时最容易犯的错是图片路径打错、对比图语法写歪，
 * 这类问题如果等到部署完才发现，就是网站上挂着一个个裂图。
 * 这个脚本让它们在 PR 阶段就变红，并且一次性把所有问题列全，
 * 不用改一个跑一次。
 *
 * 检查项：
 *   1. frontmatter 里的 title / date 是否写了
 *   2. cover 指向的文件是否存在
 *   3. 正文里 markdown 图片的路径是否存在
 *   4. ```compare 代码块的语法是否正确
 *
 * 只认 / 开头的路径（对应 public/ 目录）。相对路径在内容集合里本来就不生效，
 * 这里直接报出来，免得以为是别的问题。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCompareBlock, describeCompareProblem } from '../src/plugins/compare-core.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src/content/posts');
const PUBLIC_DIR = join(ROOT, 'public');

const IMAGE_RE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g;
const FENCE_OPEN_RE = /^```(\S*)\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;

/** @type {{ file: string, line: number, message: string, hint?: string | string[] }[]} */
const problems = [];
const addProblem = (file, line, message, hint) =>
  problems.push({ file: relative(ROOT, file), line, message, hint });

/** 检查一个 / 开头的资源路径是否存在 */
function checkAsset(file, line, rawPath, what) {
  const path = rawPath.split('#')[0].split('?')[0];

  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return; // 外链，管不着

  if (!path.startsWith('/')) {
    addProblem(
      file,
      line,
      `${what}用了相对路径「${path}」`,
      '内容集合里的相对路径不会被处理，改成相对 public/ 的绝对路径，例如 /images/xxx.png'
    );
    return;
  }

  if (!existsSync(join(PUBLIC_DIR, path))) {
    addProblem(file, line, `${what}指向的文件不存在：${path}`, `应该在 public${path}`);
  }
}

function checkPost(file) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  // —— frontmatter ——
  const frontmatterEnd = lines[0]?.trim() === '---' ? lines.indexOf('---', 1) : -1;

  if (frontmatterEnd === -1) {
    addProblem(file, 1, '开头缺少 frontmatter', '文件必须以 --- 开头，里面写 title 和 date');
  } else {
    const frontmatter = lines.slice(1, frontmatterEnd).join('\n');

    for (const key of ['title', 'date']) {
      if (!new RegExp(`^${key}\\s*:`, 'm').test(frontmatter)) {
        addProblem(file, 1, `frontmatter 里缺 ${key}`, `补上 ${key}:，两个都是必填`);
      }
    }

    const cover = frontmatter.match(/^cover\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
    if (cover) checkAsset(file, 1, cover[1].trim(), 'cover');
  }

  // —— 正文：逐行扫，需要跟踪代码块状态 ——
  let fence = null; // { lang, startLine, lines: string[] }

  lines.forEach((text, i) => {
    const lineNo = i + 1;

    if (!fence) {
      const open = text.match(FENCE_OPEN_RE);
      if (open) {
        fence = { lang: open[1], startLine: lineNo, lines: [] };
        return;
      }

      // 普通正文行，检查图片路径
      for (const match of text.matchAll(IMAGE_RE)) {
        checkAsset(file, lineNo, match[1], '图片');
      }
      return;
    }

    // 代码块内部
    if (FENCE_CLOSE_RE.test(text)) {
      if (fence.lang === 'compare') {
        const parsed = parseCompareBlock(fence.lines.join('\n'));
        if (parsed.problems.length || parsed.images.length !== 2) {
          addProblem(
            file,
            fence.startLine,
            '```compare 代码块格式不对',
            describeCompareProblem(parsed)
          );
        } else {
          // 对比图里的两张图同样是资源路径，一并校验
          for (const image of parsed.images) {
            checkAsset(file, fence.startLine, image.src, '```compare 里的图片');
          }
        }
      }
      fence = null;
      return;
    }

    fence.lines.push(text);
  });
}

// —— 执行 ——
if (!existsSync(POSTS_DIR)) {
  console.error(`找不到文章目录：${POSTS_DIR}`);
  process.exit(1);
}

for (const name of readdirSync(POSTS_DIR)) {
  if (!name.endsWith('.md')) continue;
  checkPost(join(POSTS_DIR, name));
}

if (problems.length === 0) {
  console.log('✓ 内容检查通过');
  process.exit(0);
}

console.error(`\n✗ 内容检查没通过，共 ${problems.length} 个问题：\n`);
for (const p of problems) {
  console.error(`  ${p.file}:${p.line}`);
  console.error(`    ${p.message}`);

  if (p.hint) {
    // 单行提示带箭头；多行提示整块缩进，逐行加箭头会糊成一片
    const detail = Array.isArray(p.hint) ? p.hint : [`→ ${p.hint}`];
    for (const line of detail) console.error(line ? `    ${line}` : '');
  }

  console.error('');
}
process.exit(1);
