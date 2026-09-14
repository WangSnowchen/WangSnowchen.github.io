/**
 * Shiki 的 OSL（Open Shading Language）语法定义。
 *
 * Shiki / TextMate 官方没有收录 OSL，所以这里手写一份轻量语法。
 * 覆盖：注释、字符串、数字、类型、关键字、内置函数与属性名。
 * OSL 语法脱胎于 C，因此结构上与 C 的 TextMate 语法接近。
 */
export default {
  name: 'osl',
  scopeName: 'source.osl',
  aliases: ['openshadinglanguage'],
  displayName: 'OSL',
  patterns: [
    { include: '#comments' },
    { include: '#strings' },
    { include: '#keywords' },
    { include: '#types' },
    { include: '#builtins' },
    { include: '#numbers' },
    { include: '#functions' },
  ],
  repository: {
    comments: {
      patterns: [
        {
          name: 'comment.block.osl',
          begin: '/\\*',
          end: '\\*/',
        },
        {
          name: 'comment.line.double-slash.osl',
          begin: '//',
          end: '$',
        },
        {
          name: 'comment.line.number-sign.osl',
          begin: '#',
          end: '$',
        },
      ],
    },

    strings: {
      patterns: [
        {
          name: 'string.quoted.double.osl',
          begin: '"',
          end: '"',
          patterns: [
            { name: 'constant.character.escape.osl', match: '\\\\.' },
          ],
        },
      ],
    },

    types: {
      patterns: [
        {
          name: 'storage.type.osl',
          match:
            '\\b(void|int|float|string|color|point|vector|normal|matrix|closure|struct)\\b',
        },
      ],
    },

    keywords: {
      patterns: [
        {
          name: 'storage.modifier.osl',
          match:
            '\\b(shader|surface|displacement|volume|output|const|uniform|varying|export|public|private|typedef)\\b',
        },
        {
          name: 'keyword.control.osl',
          match:
            '\\b(if|else|for|while|do|return|break|continue|switch|case|default)\\b',
        },
        {
          name: 'constant.language.osl',
          match: '\\b(true|false|NULL)\\b',
        },
      ],
    },

    // OSL 内置函数：几何、数学、纹理、属性访问
    builtins: {
      patterns: [
        {
          name: 'support.function.builtin.osl',
          match:
            '\\b(getattribute|getmessage|setmessage|gettextureinfo|trace|transform|transformc|normalize|length|distance|dot|cross|reflect|refract|faceforward|mix|smoothstep|step|clamp|min|max|abs|floor|ceil|round|sqrt|pow|exp|log|sin|cos|tan|asin|acos|atan|atan2|fmod|mod|noise|snoise|cellnoise|pnoise|psnoise|random|hash|select|isconnected|arraylength|printf|error|warning|fprintf|bank|spline|splineinverse|rotate|displace|area|calculatenormal|filterwidth)\\b',
        },
      ],
    },

    numbers: {
      patterns: [
        { name: 'constant.numeric.osl', match: '\\b0[xX][0-9a-fA-F]+\\b' },
        {
          name: 'constant.numeric.osl',
          match:
            '\\b\\d+(\\.\\d+)?([eE][+-]?\\d+)?\\b',
        },
      ],
    },

    functions: {
      patterns: [
        {
          name: 'entity.name.function.osl',
          match: '\\b([A-Za-z_][A-Za-z0-9_]*)(?=\\s*\\()',
        },
      ],
    },
  },
};
