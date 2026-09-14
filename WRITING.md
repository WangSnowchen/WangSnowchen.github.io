# 写文章

只管写内容。格式、高亮、索引、部署都是自动的。

## 新机器上准备一次

需要 **Node 22**（CI 用的就是这个版本）和 git。

```bash
git clone https://github.com/WangSnowchen/WangSnowchen.github.io.git
cd WangSnowchen.WangSnowchen.github.io

# 提交身份。不配的话 git 会回退成 用户名@主机名.local 这种邮箱，
# GitHub 认不出来，提交不会关联到你的账号，还会把机器名公开出去
git config user.name  "WangSnowchen"
git config user.email "WangSnowchen@users.noreply.github.com"

npm ci
```

推送需要认证：配 SSH key，或者建一个 personal access token 当密码用。

## 发一篇新文章

```bash
# 1. 从最新的 main 开一个分支
git switch main && git pull
git switch -c post/文章名

# 2. 复制模板。文件名会变成网址：foo-bar.md → /post/foo-bar/
cp templates/post.md src/content/posts/文件名.md

# 3. 改 frontmatter、写正文。图片放进 public/images/，
#    正文里用 /images/文件名 引用

# 4. 本地先自查，一秒出结果，不用等 CI
npm run check:content

# 5. 提交推送
git add -A
git commit -m "新文章：文章标题"
git push -u origin post/文章名
```

推送后 GitHub 会给出开 PR 的链接，点进去建 PR 即可。

**PR 上会自动跑一遍完整构建**（内容检查 → 构建 → 核对产物 → 建索引），
变绿就合并。合并进 `main` 后自动部署到 Pages，搜索索引一并重建。

一次改多篇文章也一样，都放在同一个分支里就行。

## frontmatter

只有 `title` 和 `date` 是必填的。

```yaml
---
title: 在 Gaffer 中实现 Maya 的 CenterPivot 功能
description: 一句话摘要，显示在列表页和搜索结果里。可以不写。
date: 2026-09-15
tags: ['Gaffer', 'BoundQuery']
cover: /images/封面.png
---
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `date` | 是 | 只写 `2026-09-15` 就行，别带时间 |
| `description` | 否 | 摘要。不写的话列表页只显示标题 |
| `tags` | 否 | 数组，用来生成标签页 |
| `cover` | 否 | 封面图，相对 `public/` 的路径 |

> **关于日期**：只写到天，比如 `2026-09-15`。写成 `2026-09-15 23:58:01` 的话，
> YAML 会把它当 UTC 时间解析，在东八区显示出来就变成第二天了。

## 支持的写法

都是标准 markdown，没有自定义语法 —— 除了下面那个对比图。

### 标题与正文

`##` 二级标题会进右边的目录（移动端是页面顶部可展开的目录）。加粗、斜体、删除线、
行内代码、引用块、有序无序列表、嵌套列表都照常写。

### 代码块

用三个反引号加语言名。明暗主题各一套配色，切换主题不用重新渲染。

支持的常见语言都有；`osl` 是单独注册过的，也能高亮。

### 图片

```markdown
![图片说明](/images/xxx.png)
```

放在 `public/images/` 下，用 `/images/` 开头的绝对路径引用。**相对路径不生效**，
检查会直接报出来。

点图片可以放大，鼠标滚轮或 ESC 关闭。

### AB 对比图

用 `compare` 代码块，里面正常写两行 markdown 图片：

````markdown
```compare
![修改前](/images/before.png)
![修改后](/images/after.png)
```
````

- 第一张在左（底图），第二张在右
- 中间会出现一个滑块，拖动看差异；键盘方向键也能调（`Shift` 加速，`Home`/`End` 到两端）
- `alt` 文字会变成图上的标签，不想显示标签就写空的 `![]()`
- 两张图尺寸不一致时以第一张为准，第二张会被裁切

### 视频嵌入

直接写 iframe：

```html
<iframe src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD"
        width="100%" height="400" frameborder="0" allowfullscreen></iframe>
```

### 表格与脚注

标准 markdown 语法。表格过宽时可以横向滚动。

```markdown
| 参数 | 默认值 |
| --- | --- |
| spacing | 30 |

这里有个脚注[^1]。

[^1]: 脚注内容。
```

## 报错了怎么办

检查不通过时会列出「文件:行号 + 原因」，照着改就行。最常见的三种：

**图片找不到**

```
src/content/posts/xxx.md:12
  图片指向的文件不存在：/images/typo.png
  → 应该在 public/images/typo.png
```

文件名拼错了，或者图还没放进 `public/images/`。

**用了相对路径**

```
  图片用了相对路径「./local.png」
  → 内容集合里的相对路径不会被处理，改成相对 public/ 的绝对路径
```

`./local.png` 改成 `/images/local.png`。

**对比图格式不对**

````
  第 2 行  这行不是图片
````

`compare` 代码块里每一行都必须是完整的 `![](路径)`，前后不能有多余文字，
而且必须正好两行。

## 自己先跑一遍

不想等 PR 的话，本地可以提前检查：

```bash
npm run check:content   # 只跑内容检查，一秒出结果
npm run build           # 完整构建（检查 + 构建 + 建索引）
npm run dev             # 本地预览，写作时开着
```

注意 `npm run dev` 下搜索功能不可用，因为搜索索引是构建时才生成的。
要试搜索用 `npm run build && npm run preview`。
