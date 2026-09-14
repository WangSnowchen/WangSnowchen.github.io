#!/usr/bin/env node
/**
 * 构建入口。
 *
 * 为什么要自己写一层，而不是在 package.json 里用 && 串起来：
 *
 * **Astro 在 markdown 渲染失败时不会失败。** 实测过：markdown 抛错时它退出码是 0，
 * 日志里一行都不打，只是安静地生成一个正文空白的页面。CI 全绿，坏页面照样发出去。
 *
 * 所以这里做三件事，环环相扣：
 *   1. check-content.mjs 先拦 —— 图片路径、对比图语法、必填字段，它以非 0 退出；
 *   2. astro build 跑完后核对每一篇的产物 —— 源文件有正文，页面上就必须有正文；
 *      对比图在源文件里有几块，产物里就得有几个。这是唯一能兜住上面那个坑的办法；
 *   3. pagefind 建搜索索引。
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src/content/posts');
const DIST_DIR = join(ROOT, 'dist');

/** 源文件里正文短于这个长度就不做比对，免得把一行字的占位文章误判成渲染失败 */
const MIN_COMPARABLE_TEXT = 30;

// ==========================================================================
// 工具
// ==========================================================================

/**
 * 解析依赖自带的可执行入口，避免依赖 node_modules/.bin 是否在 PATH 上。
 *
 * 直接翻 node_modules 而不是用 require.resolve：pagefind 的 exports 只声明了
 * import 条件，CJS 模式解析会报 "No exports main defined"。往上逐层找还能顺带
 * 兼容 pnpm 之类的提升布局。
 */
function binPath(pkg) {
  let dir = ROOT;

  while (dir !== dirname(dir)) {
    const pkgJsonPath = join(dir, 'node_modules', pkg, 'package.json');
    if (existsSync(pkgJsonPath)) {
      const { bin } = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      return join(dirname(pkgJsonPath), typeof bin === 'string' ? bin : bin[pkg]);
    }
    dir = dirname(dir);
  }

  throw new Error(`在 node_modules 里找不到 ${pkg}`);
}

/** 边跑边透传输出（不然构建时屏幕上一片空白），同时把日志攒下来 */
function run(entry, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [entry, ...args], { cwd: ROOT });
    let output = '';

    for (const [stream, sink] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ]) {
      stream.on('data', (chunk) => {
        output += chunk;
        sink.write(chunk);
      });
    }

    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

const stripWhitespace = (text) => text.replace(/\s+/g, '');

/** 源码里的正文文本，去掉代码块、图片、链接目标这些不直接出现在正文里的东西 */
function sourceText(markdown) {
  return stripWhitespace(
    markdown
      .replace(/^---[\s\S]*?\n---/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~|-]/g, ' ')
  );
}

/** 产物里 .prose 容器内的纯文本 */
function renderedText(html) {
  const start = html.indexOf('<div class="prose">');
  if (start === -1) return '';

  const rest = html.slice(start);
  const end = rest.indexOf('<section class="comments"');
  return stripWhitespace((end === -1 ? rest : rest.slice(0, end)).replace(/<[^>]+>/g, ' '));
}

const countOccurrences = (text, needle) => text.split(needle).length - 1;

// ==========================================================================
// 2.5 核对产物
// ==========================================================================

function verifyRendered() {
  const failures = [];

  for (const name of readdirSync(POSTS_DIR)) {
    if (!name.endsWith('.md')) continue;

    const id = name.replace(/\.md$/, '');
    const pagePath = join(DIST_DIR, 'post', id, 'index.html');

    if (!existsSync(pagePath)) {
      failures.push(`${name} 没有生成对应页面（应有 dist/post/${id}/index.html）`);
      continue;
    }

    const source = readFileSync(join(POSTS_DIR, name), 'utf8');
    const html = readFileSync(pagePath, 'utf8');

    // 对比图是精确计数，不存在阈值判断的模糊地带
    const sourceCompares = countOccurrences(source, '```compare');
    const renderedCompares = countOccurrences(html, 'class="compare"');
    if (sourceCompares !== renderedCompares) {
      failures.push(
        `${name}: 源文件里有 ${sourceCompares} 个 \`\`\`compare 代码块，页面上只渲染出 ${renderedCompares} 个`
      );
    }

    // 正文长度比对：markdown 渲染整体失败时页面正文会是空的
    const sourceLength = sourceText(source).length;
    const renderedLength = renderedText(html).length;

    if (sourceLength >= MIN_COMPARABLE_TEXT && renderedLength < sourceLength * 0.3) {
      failures.push(
        `${name}: 源文件正文约 ${sourceLength} 字，页面上只剩 ${renderedLength} 字，渲染大概率失败了`
      );
    }
  }

  // 反过来再核一遍：产物里有、源文件里没有的文章页。
  // 内容层的旧缓存会凭空把这些页面重新生成出来，删过的文章就这么发出去了。
  // 上面那个循环只遍历源文件，正好漏掉这种情况，所以要单独查。
  const postDistDir = join(DIST_DIR, 'post');

  if (existsSync(postDistDir)) {
    const sources = new Set(
      readdirSync(POSTS_DIR)
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.replace(/\.md$/, ''))
    );

    for (const name of readdirSync(postDistDir)) {
      if (!sources.has(name)) {
        failures.push(
          `dist/post/${name}/ 有页面，但 src/content/posts/${name}.md 已经不存在了——` +
            `删掉的文章被内容层缓存重新生成出来了`
        );
      }
    }
  }

  return failures;
}

// ==========================================================================
// 流程
// ==========================================================================

// —— 1. 内容检查 ——
const check = await run(join(ROOT, 'scripts/check-content.mjs'), []);
if (check.code !== 0) process.exit(check.code);

// —— 2. Astro 构建 ——

// 先删掉内容层缓存。它不在 .astro/ 下，而在 node_modules/.astro/data-store.json，
// 而且是只进不出的：markdown 删掉之后缓存里还留着旧条目，Astro 会照着缓存把那些
// 页面继续生成出来，本地看着就像没删干净。
// CI 上 npm ci 会重建整个 node_modules，所以线上是干净的 —— 本地和线上结果不一致，
// 正是最难查的那类问题。每次构建都从源码重新同步，两边就对齐了。
rmSync(join(ROOT, 'node_modules/.astro'), { recursive: true, force: true });

const build = await run(binPath('astro'), ['build']);
if (build.code !== 0) process.exit(build.code);

// Astro 有部分错误是会写日志的（比如 glob-loader 的渲染报错），顺手也拦一下
if (build.output.includes('[ERROR]')) {
  console.error(
    [
      '',
      '✗ 构建日志里出现了 [ERROR]，具体报错往上翻。',
      '  Astro 不保证因为这类错误而失败，所以这里主动判定为失败。',
      '',
    ].join('\n')
  );
  process.exit(1);
}

// —— 2.5 核对产物 ——
const failures = verifyRendered();
if (failures.length) {
  console.error(`\n✗ 产物核对没通过，共 ${failures.length} 处：\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    '\n  两类问题都会落在这里：正文渲染失败（Astro 不会因此报错，页面只是变空），' +
      '\n  或者删掉的文章被内容层缓存重新生成。往上翻构建日志找线索，' +
      '\n  也可以单独跑 npm run check:content。\n'
  );
  process.exit(1);
}

// —— 3. 搜索索引 ——
const index = await run(binPath('pagefind'), ['--site', 'dist']);
process.exit(index.code);
