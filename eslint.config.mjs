import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import format from 'eslint-plugin-format'
import jsonc from 'eslint-plugin-jsonc'
import * as mdx from 'eslint-plugin-mdx'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import yml from 'eslint-plugin-yml'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([

  // ---------------------- 全局忽略 ----------------------
  // 排除构建产物、依赖目录和锁文件
  globalIgnores([
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
    'public',
    'data/*.json',
    'test/**',
  ]),

  // ---------------------- YAML ----------------------
  // 对 .yml / .yaml 启用语法校验与风格检查
  ...yml.configs['flat/recommended'],

  // ---------------------- MDX / Markdown ----------------------
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
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // .md / .mdx 文本交给 Prettier 排版
  {
    files: ['**/*.mdx', '**/*.md'],
    plugins: { format },
    rules: {
      'format/prettier': [
        'error',
        {
          parser: 'mdx',
          tabWidth: 2,
          singleQuote: true,
          semi: false,
          endOfLine: 'auto',
        },
      ],
      '@stylistic/indent': 'off',
      '@stylistic/quotes': 'off',
      '@stylistic/semi': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/array-element-newline': 'off',
      '@stylistic/array-bracket-newline': 'off',
      '@stylistic/object-curly-spacing': 'off',
      '@stylistic/jsx-quotes': 'off',
      '@stylistic/jsx-wrap-multilines': 'off',
    },
  },

  // ---------------------- JSON / JSONC / JSON5 ----------------------
  ...jsonc.configs['flat/recommended-with-json'],
  ...jsonc.configs['flat/recommended-with-jsonc'],
  ...jsonc.configs['flat/recommended-with-json5'],

  // 统一 JSON 风格
  {
    files: ['**/*.json', '**/*.json5', '**/*.jsonc'],
    rules: {
      'jsonc/indent': ['error', 2],
      'jsonc/quotes': ['error', 'double'],
      'jsonc/quote-props': ['error', 'always'],
      'jsonc/comma-dangle': ['error', 'never'],
      'jsonc/array-bracket-spacing': ['error', 'never'],
      'jsonc/object-curly-spacing': ['error', 'always'],
      'jsonc/key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'jsonc/comma-style': ['error', 'last'],
    },
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
  },

  // ---------------------- TypeScript / JavaScript / JSX ----------------------
  {
    files: ['**/*.{ts,js,jsx,cjs,mjs,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.recommended,
    ],
    plugins: {
      '@stylistic': stylistic,
      react,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // 固定 TS 解析根目录为本配置所在目录，避免 monorepo 下「多候选 tsconfigRootDir」报错
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'never',
        },
      ],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/array-bracket-newline': ['error', 'consistent'],
      '@stylistic/object-curly-newline': [
        'error',
        {
          ObjectExpression: { multiline: true, consistent: true },
          ObjectPattern: { multiline: true, consistent: true },
          ImportDeclaration: { multiline: true, consistent: true },
          ExportDeclaration: { multiline: true, consistent: true },
        },
      ],
      '@stylistic/function-paren-newline': ['error', 'consistent'],
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
      '@stylistic/space-infix-ops': ['error', { int32Hint: false }],
      '@stylistic/template-curly-spacing': ['error', 'never'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_|^ignore$',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
        },
      ],
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],
      '@stylistic/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
      '@stylistic/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
      '@stylistic/jsx-closing-bracket-location': ['error', 'tag-aligned'],
      '@stylistic/jsx-indent-props': ['error', 2],
      '@stylistic/jsx-wrap-multilines': [
        'error',
        {
          declaration: 'parens-new-line',
          assignment: 'parens-new-line',
          return: 'parens-new-line',
          arrow: 'parens-new-line',
          condition: 'parens-new-line',
          logical: 'parens-new-line',
          prop: 'parens-new-line',
        },
      ],
      '@stylistic/jsx-tag-spacing': [
        'error',
        {
          closingSlash: 'never',
          beforeSelfClosing: 'always',
          afterOpening: 'never',
          beforeClosing: 'never',
        },
      ],
      '@stylistic/jsx-child-element-spacing': 'error',
      'react/self-closing-comp': ['error', { component: true, html: false }],
      'react/no-danger': ['error', {}],
      'react/jsx-curly-brace-presence': [
        'error',
        {
          props: 'never',
          children: 'never',
          propElementValues: 'always',
        },
      ],
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      'no-unmodified-loop-condition': 'error',
      'preserve-caught-error': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportDeclaration[source.value='lucide-react'] > ImportSpecifier[imported.name=/^(?!.*Icon$).*$/]",
          message: "从 'lucide-react' 导入图标时，必须使用以 'Icon' 结尾的成员（例如：使用 'PiIcon' 而不是 'Pi'）。",
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              importNames: ['/^(?!.*Icon$).*$/'],
              message: "从 'lucide-react' 导入图标时，必须使用以 'Icon' 结尾的成员名（例如：使用 'PiIcon' 而不是 'Pi'）。",
            },
          ],
        },
      ],
    },
  },

  // ---------------------- MDX 虚拟文件覆盖 ----------------------
  // 必须放在核心 TS/JS 块之后，才能覆盖里面的规则
  {
    files: ['**/*.{md,mdx}/**'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-useless-assignment': 'off',
      'no-unused-private-class-members': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      'no-with': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      'react-hooks/rules-of-hooks': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'react/jsx-no-undef': 'off',
      'react/no-danger': 'off',
      '@stylistic/jsx-child-element-spacing': 'off',
      'react/no-deprecated': 'off',
      'react/display-name': 'off',
      'jsonc/no-comments': 'off',
    },
  },

  // ---------------------- 测试文件 ----------------------
  {
    files: ['tests/**/*.{ts,js,jsx,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // ---------------------- shadcn/ui 组件 ----------------------
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
