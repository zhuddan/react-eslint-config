// 把 JS 值序列化成与项目风格一致的源码文本：
// 单引号、2 空格缩进、短值内联、长值换行。用于把 *.rule.jsonc 里的规则
// 内联进生成的 eslint.config.mjs（保持单引号风格，避免生成文件与自身 lint 打架）。

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

const ID = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const MAX = 72 // 单行内联的大致宽度上限

// 仿 @stylistic/quotes 的 avoidEscape：含单引号且不含双引号时改用双引号
function quoteString(s: string): string {
  if (s.includes("'") && !s.includes('"'))
    return `"${s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')}"`
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
}

// 合法标识符的键不加引号（如 avoidEscape），否则加引号（如 '@stylistic/indent'）
function quoteKey(k: string): string {
  return ID.test(k) ? k : quoteString(k)
}

function isObject(v: JsonValue): v is { [key: string]: JsonValue } {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// 不换行的内联形式
function inlineForm(v: JsonValue): string {
  if (v === null)
    return 'null'
  if (typeof v === 'string')
    return quoteString(v)
  if (typeof v === 'number' || typeof v === 'boolean')
    return String(v)
  if (Array.isArray(v))
    return v.length ? `[${v.map(inlineForm).join(', ')}]` : '[]'
  const keys = Object.keys(v)
  return keys.length
    ? `{ ${keys.map((k) => `${quoteKey(k)}: ${inlineForm(v[k])}`).join(', ')} }`
    : '{}'
}

// indent: 该值所在行的缩进列数（也是换行时收尾括号的对齐列）
export function serialize(v: JsonValue, indent = 0): string {
  // 标量始终内联（即使很长，如 AST selector 字符串），只有数组/对象才换行
  if (!Array.isArray(v) && !isObject(v))
    return inlineForm(v)

  const inline = inlineForm(v)
  if (inline.length + indent <= MAX)
    return inline

  const pad = ' '.repeat(indent)
  const padIn = ' '.repeat(indent + 2)
  // 多行结构补尾随逗号，匹配项目 comma-dangle: always-multiline，避免生成文件自检时被改动
  if (Array.isArray(v)) {
    const items = v.map((x) => padIn + serialize(x, indent + 2))
    return `[\n${items.join(',\n')},\n${pad}]`
  }
  const items = Object.keys(v).map(
    (k) => `${padIn}${quoteKey(k)}: ${serialize(v[k], indent + 2)}`
  )
  return `{\n${items.join(',\n')},\n${pad}}`
}

// 只输出对象条目（不含外层大括号），用于需要在 spread 之后追加规则的场景
export function serializeEntries(obj: Record<string, JsonValue>, indent: number): string {
  const pad = ' '.repeat(indent)
  return Object.keys(obj)
    .map((k) => `${pad}${quoteKey(k)}: ${serialize(obj[k], indent)},`)
    .join('\n')
}
