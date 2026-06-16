// import key -> import 语句（输出顺序即此对象的定义顺序，已按模块路径排序）
export const IMPORTS: Record<string, string> = {
  eslintReact: "import eslintReact from '@eslint-react/eslint-plugin'",
  js: "import js from '@eslint/js'",
  stylistic: "import stylistic from '@stylistic/eslint-plugin'",
  nextVitals: "import nextVitals from 'eslint-config-next/core-web-vitals'",
  nextTs: "import nextTs from 'eslint-config-next/typescript'",
  format: "import format from 'eslint-plugin-format'",
  jsonc: "import jsonc from 'eslint-plugin-jsonc'",
  mdx: "import * as mdx from 'eslint-plugin-mdx'",
  react: "import react from 'eslint-plugin-react'",
  reactHooks: "import reactHooks from 'eslint-plugin-react-hooks'",
  reactRefresh: "import reactRefresh from 'eslint-plugin-react-refresh'",
  yml: "import yml from 'eslint-plugin-yml'",
  eslintConfig: "import { defineConfig, globalIgnores } from 'eslint/config'",
  globals: "import globals from 'globals'",
  tseslint: "import tseslint from 'typescript-eslint'",
}

// import key -> npm 包名（用于按需推导依赖）
export const IMPORT_DEPS: Record<string, string> = {
  eslintReact: '@eslint-react/eslint-plugin',
  js: '@eslint/js',
  stylistic: '@stylistic/eslint-plugin',
  nextVitals: 'eslint-config-next',
  nextTs: 'eslint-config-next',
  format: 'eslint-plugin-format',
  jsonc: 'eslint-plugin-jsonc',
  mdx: 'eslint-plugin-mdx',
  react: 'eslint-plugin-react',
  reactHooks: 'eslint-plugin-react-hooks',
  reactRefresh: 'eslint-plugin-react-refresh',
  yml: 'eslint-plugin-yml',
  eslintConfig: 'eslint',
  globals: 'globals',
  tseslint: 'typescript-eslint',
}

// 未被 import 直接引用、但运行必需的 peer 依赖
export const PEER_DEPS: { always: string[], perImport: Record<string, string[]> } = {
  // 恒需要：typescript-eslint 依赖 typescript
  always: ['typescript'],
  // 仅当对应 import key 被选中时才需要
  perImport: {
    yml: ['yaml-eslint-parser'], // eslint-plugin-yml 解析 YAML 需要
  },
}
