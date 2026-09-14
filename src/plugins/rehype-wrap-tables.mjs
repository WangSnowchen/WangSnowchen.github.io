import { visit } from 'unist-util-visit';

/**
 * 给 Markdown 生成的 <table> 套一层 <div class="table-wrap">，
 * 让宽表格在窄屏上可以横向滚动，而不是撑破正文栏。
 */
export default function rehypeWrapTables() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === null) return;

      // 已经包过就跳过，避免重复处理
      if (parent.children[index - 1]?.properties?.className?.includes?.('table-wrap')) return;

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [node],
      };
    });
  };
}
