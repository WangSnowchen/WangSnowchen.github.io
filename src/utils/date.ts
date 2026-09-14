/**
 * 统一的日期格式化。
 *
 * 踩过的坑：frontmatter 里未加引号的 `2024-03-22 23:58:01` 会被 YAML 当成
 * 时间戳类型，按 UTC 解析（Astro content layer 收到的就是 2024-03-22T23:58:01Z）。
 * 如果再用本机时区去格式化，东八区就会显示成次日 03-23。
 *
 * 因此这里固定以 UTC 输出：写的是什么就显示什么，且本地与 CI（GitHub Actions
 * 跑在 UTC）构建结果一致。
 *
 * 如果确实需要按某个时区显示，改这里的 timeZone 即可。
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  })
    .format(date)
    .replace(/\//g, '-');
}

/** 只要「月-日」，用于归档页这种年份已分组的场景 */
export function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  })
    .format(date)
    .replace(/\//g, '-');
}

/**
 * 归档分组用的年份。用 UTC 取，避免跨时区掉到上一年。
 */
export function yearOf(date: Date): number {
  return date.getUTCFullYear();
}

/** 供 <time datetime="..."> 使用的机器可读格式 */
export function toISO(date: Date): string {
  return date.toISOString();
}
