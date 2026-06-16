import fs from 'node:fs'
import path from 'node:path'
import { IMPORT_DEPS, IMPORTS, PEER_DEPS } from './registry'
import { readRuleFile } from './load'
import { type JsonValue, serialize, serializeEntries } from './serialize'
import { srcDir } from './paths'

export type Framework = 'next' | 'vite' | 'fallback'
export interface Features { yml: boolean, mdx: boolean, json: boolean }
interface Ctx {
  framework: Framework
  features: Features
  registerReact: boolean
  reactRefreshPreset: string
}

function asRecord(v: JsonValue): Record<string, JsonValue> {
  return v as Record<string, JsonValue>
}

// 读取全部规则数据（src/rules/*.rule.jsonc）
const R = {
  typescript: readRuleFile('typescript'),
  react: readRuleFile('react'),
  bestPractices: readRuleFile('best-practices'),
  next: readRuleFile('next'), // { service, action }
  json: readRuleFile('json'),
  mdx: readRuleFile('mdx'), // { codeBlocks, format, override }
}

// ---------------------- 结构性脚手架（非规则部分留在代码里） ----------------------

function reactRefreshPreset(framework: Framework): string {
  if (framework === 'next')
    return 'reactRefresh.configs.next'
  if (framework === 'vite')
    return 'reactRefresh.configs.vite'
  return 'reactRefresh.configs.recommended'
}

function coreImportKeys(ctx: Ctx): string[] {
  return [
    'js',
    'stylistic',
    'eslintReact',
    'reactHooks',
    'reactRefresh',
    'eslintConfig',
    'globals',
    'tseslint',
    ...(ctx.registerReact ? ['react'] : []),
  ]
}

function renderIgnores(ctx: Ctx): string {
  const base = [
    'dist',
    'build/**',
    'out/**',
    '.next/**',
    '**/node_modules/**',
    'package-lock.json',
    '**/pnpm-lock.yaml',
    'bun.lock',
    '.agents',
    '.claude',
    '.heroui-docs',
    'runtime',
  ]
  const extra = ctx.framework === 'next'
    ? ['next-env.d.ts', '.source/**', '**/*.nocheck.mdx', '**/*/type-check.mdx']
    : ['public', 'data/*.json']
  const list = [...base, ...extra].map((p) => `    '${p}',`).join('\n')
  return `  // ---------------------- 全局忽略 ----------------------
  // 排除构建产物、依赖目录和锁文件
  globalIgnores([
${list}
  ]),`
}

function renderNextPrelude(): string {
  return `  // ---------------------- Next.js 基础配置 ----------------------
  // Core Web Vitals 规则集（性能与可访问性）+ TypeScript 专属规则集
  ...nextVitals,
  ...nextTs,`
}

function renderYml(): string {
  return `  // ---------------------- YAML ----------------------
  // 对 .yml / .yaml 启用语法校验与风格检查
  ...yml.configs['flat/recommended'],`
}

function renderJson(): string {
  return `  // ---------------------- JSON / JSONC / JSON5 ----------------------
  ...jsonc.configs['flat/recommended-with-json'],
  ...jsonc.configs['flat/recommended-with-jsonc'],
  ...jsonc.configs['flat/recommended-with-json5'],

  // 统一 JSON 风格
  {
    files: ['**/*.json', '**/*.json5', '**/*.jsonc'],
    rules: ${serialize(R.json, 4)},
  },

  // tsconfig / VSCode 等 JSONC 文件允许注释
  {
    files: [
      '**/*.jsonc',
      '**/.vscode/*.json',
      '**/tsconfig*.json',
    ],
    rules: {
      'jsonc/no-comments': 'off',
    },
  },`
}

function renderMdx(): string {
  return `  // ---------------------- MDX / Markdown ----------------------
  // 启用 MDX 解析；lintCodeBlocks 同时校验文档内代码块
  {
    ...mdx.flat,
    processor: mdx.createRemarkProcessor({
      lintCodeBlocks: true,
      languageMapper: {},
    }),
  },

  // MDX 代码块约束
  {
    ...mdx.flatCodeBlocks,
    rules: {
      ...mdx.flatCodeBlocks.rules,
${serializeEntries(asRecord(R.mdx.codeBlocks), 6)}
    },
  },

  // .md / .mdx 文本交给 Prettier 排版
  {
    files: ['**/*.mdx', '**/*.md'],
    plugins: { format },
    rules: ${serialize(R.mdx.format, 4)},
  },`
}

function renderCore(ctx: Ctx): string {
  const rules: Record<string, JsonValue> = {
    ...asRecord(R.typescript),
    ...asRecord(R.react),
    ...asRecord(R.bestPractices),
  }
  const plugins = ctx.registerReact
    ? `{
      '@stylistic': stylistic,
      '@eslint-react': eslintReact,
      react,
    }`
    : `{
      '@stylistic': stylistic,
      '@eslint-react': eslintReact,
    }`
  return `  // ---------------------- TypeScript / JavaScript / JSX ----------------------
  {
    files: ['**/*.{ts,js,jsx,cjs,mjs,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      ${ctx.reactRefreshPreset},
    ],
    plugins: ${plugins},
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // 固定 TS 解析根目录为本配置所在目录，避免 monorepo 下「多候选 tsconfigRootDir」报错
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: ${serialize(rules, 4)},
  },`
}

function renderMdxOverride(ctx: Ctx): string {
  // 基础项 + 按条件追加（对应插件只有这些条件下才注册）
  const override: Record<string, JsonValue> = { ...asRecord(R.mdx.override) }
  if (ctx.features.json)
    override['jsonc/no-comments'] = 'off'
  if (ctx.framework === 'next') {
    override['import/no-anonymous-default-export'] = 'off'
    override['@next/next/no-img-element'] = 'off'
  }
  return `  // ---------------------- MDX 虚拟文件覆盖 ----------------------
  // 必须放在核心 TS/JS 块之后，才能覆盖里面的规则
  {
    files: ['**/*.{md,mdx}/**'],
    rules: ${serialize(override, 4)},
  },`
}

const TEST_OVERRIDE = `  // ---------------------- 测试文件 ----------------------
  {
    files: ['tests/**/*.{ts,js,jsx,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },`

const SHADCN_OVERRIDE = `  // ---------------------- shadcn/ui 组件 ----------------------
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },`

function renderServiceAction(): string {
  return `  // ---------------------- Service 层规范（*.service.ts） ----------------------
  {
    files: ['**/*.service.ts'],
    rules: ${serialize(R.next.service, 4)},
  },

  // ---------------------- Action 层规范（*.action.ts） ----------------------
  {
    files: ['**/*.action.ts'],
    rules: ${serialize(R.next.action, 4)},
  },`
}

// ---------------------- import 与依赖推导 ----------------------

function collectImportKeys(ctx: Ctx): Set<string> {
  const keys = new Set<string>(coreImportKeys(ctx))
  if (ctx.framework === 'next') {
    keys.add('nextVitals')
    keys.add('nextTs')
  }
  if (ctx.features.yml)
    keys.add('yml')
  if (ctx.features.mdx) {
    keys.add('mdx')
    keys.add('format')
  }
  if (ctx.features.json)
    keys.add('jsonc')
  return keys
}

interface DepsTable { dependencies?: Record<string, string>, devDependencies?: Record<string, string> }

function resolveDeps(keys: Set<string>, framework: Framework): { deps: Record<string, string>, missing: string[] } {
  const depsFile = framework === 'next' ? 'next.deps.json' : 'vite.deps.json'
  const table = JSON.parse(fs.readFileSync(path.join(srcDir, depsFile), 'utf8')) as DepsTable
  const versions: Record<string, string> = { ...table.dependencies, ...table.devDependencies }

  const names = new Set<string>()
  for (const key of keys)
    names.add(IMPORT_DEPS[key])
  for (const dep of PEER_DEPS.always)
    names.add(dep)
  for (const key of keys) {
    for (const dep of PEER_DEPS.perImport[key] ?? [])
      names.add(dep)
  }

  const deps: Record<string, string> = {}
  const missing: string[] = []
  for (const name of names) {
    if (versions[name])
      deps[name] = versions[name]
    else
      missing.push(name)
  }
  return { deps, missing }
}

// ---------------------- 拼装 ----------------------

export function assemble({ framework, features }: { framework: Framework, features: Features }): {
  content: string
  deps: Record<string, string>
  missing: string[]
} {
  const ctx: Ctx = {
    framework,
    features,
    registerReact: framework !== 'next',
    reactRefreshPreset: reactRefreshPreset(framework),
  }

  const keys = collectImportKeys(ctx)
  const importLines = Object.keys(IMPORTS)
    .filter((k) => keys.has(k))
    .map((k) => IMPORTS[k])
    .join('\n')

  const blocks: string[] = []
  if (framework === 'next')
    blocks.push(renderNextPrelude())
  blocks.push(renderIgnores(ctx))
  if (features.yml)
    blocks.push(renderYml())
  if (features.mdx)
    blocks.push(renderMdx())
  if (features.json)
    blocks.push(renderJson())
  blocks.push(renderCore(ctx))
  if (features.mdx)
    blocks.push(renderMdxOverride(ctx))
  blocks.push(TEST_OVERRIDE)
  if (ctx.registerReact)
    blocks.push(SHADCN_OVERRIDE)
  if (framework === 'next')
    blocks.push(renderServiceAction())

  const content = `${importLines}

export default defineConfig([

${blocks.join('\n\n')}
])
`

  const { deps, missing } = resolveDeps(keys, framework)
  return { content, deps, missing }
}
