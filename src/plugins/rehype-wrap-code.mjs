import { visit } from 'unist-util-visit';

/**
 * 给 Markdown 生成的 <pre>（Shiki 高亮输出）套一层 <div class="code-block">。
 *
 * 为什么不直接把复制按钮塞进 <pre>：.prose pre 带 overflow-x: auto，
 * 绝对定位的子元素会跟着长代码行一起横向滚走，滚动条一拉按钮就跑出可视区。
 * 按钮必须待在一个不滚动的外层里，所以这里和 rehype-wrap-tables 一个思路，
 * 先包一层当定位基准。
 *
 * 只包 pre，不碰 ```compare —— 那个在 remark 阶段已经变成了 div。
 */
export default function rehypeWrapCode() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent || index === null) return;

      // 已经包过就跳过，避免重复处理
      if (parent.children[index - 1]?.properties?.className?.includes?.('code-block')) return;

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-block'] },
        children: [node],
      };
    });
  };
}
