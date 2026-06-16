# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 这个包是什么

`@zd~/react-eslint-config` 是一个**命令行脚手架**，不是一个可被 import 的共享配置。
运行 `npx @zd~/react-eslint-config` 后，它交互式地询问框架与文件类型，然后在用户项目里**生成一个自包含的 `eslint.config.mjs`**——生成的文件直接 import 各个 eslint 插件，**不会 import 本包**。同时按需把缺失的依赖写进用户的 `package.json#devDependencies`（只写入版本，不执行安装）。

## 常用命令

```bash
pnpm build        # tsup 打包 bin/index.ts → dist/index.js（CJS 单文件，含运行时依赖）
pnpm eslint       # 用本仓库自己的 eslint.config.mjs 自检并 --fix
```

无单元测试框架。验证靠 `test/next` 和 `test/vite` 两个 fixture 项目，流程为：

```bash
pnpm build
cd test/next               # 或 test/vite
pnpm config                # = node ../../dist/index.js --framework next --all，生成 eslint.config.mjs
pnpm lint                  # eslint . 验证生成的配置能跑通
```

CLI 非交互参数（供脚本/测试用）：`--framework <vite|next|fallback>`、`--features <yml,mdx,json>`、`--all`、`--none`。

## 核心架构

整个生成过程围绕一个关键设计：**配置是以源码文本（字符串拼接）的形式生成的，而不是构造 JS 对象再序列化**。这样生成的文件可读、可被用户手改，且能通过本仓库自己的 lint 风格检查。

数据流（`bin/index.ts` → `src/build.ts#assemble`）：

1. **`bin/index.ts`** — CLI 入口。用 `@clack/prompts` 收集选择（或解析 flag），调用 `assemble()`，把返回的 `content` 写成 `eslint.config.mjs`，把 `deps` 合并进用户 `package.json`（用户已声明的依赖保留其版本）。运行前会检查是否已存在 eslint 配置文件，存在则中止以防覆盖。
2. **`src/build.ts`** — 拼装中枢。`assemble({ framework, features })` 按条件把一系列 `render*()` 模板字符串块拼成完整配置文本，并推导出需要的 import 与依赖。
3. **`src/registry.ts`** — 三张映射表：import key → import 语句（`IMPORTS`，定义顺序即输出顺序）、import key → npm 包名（`IMPORT_DEPS`）、运行必需但不被直接 import 的 peer 依赖（`PEER_DEPS`，如 `typescript`、`yaml-eslint-parser`）。
4. **`src/rules/*.rule.jsonc`** — 真正的 ESLint 规则数据，从脚手架代码中剥离出来。按类别分文件（`typescript` / `react` / `best-practices` / `next` / `json` / `mdx`），用 jsonc 以便写注释和尾随逗号。
5. **`src/load.ts`** — 用 `jsonc-parser` 读取 `.rule.jsonc`，容忍注释与尾随逗号。
6. **`src/serialize.ts`** — 把规则 JSON 值序列化回**符合本项目风格的源码文本**（单引号、2 空格缩进、短值内联/长值换行、多行结构补尾随逗号）。目的是让生成文件不与自身 lint 规则打架。
7. **`src/paths.ts`** — 运行时定位数据文件。无论开发态（`src/`）还是打包后（`dist/index.js`），`pkgRoot` 都是当前文件目录的上一级，`srcDir = <pkgRoot>/src`。因此 `src/rules` 与 `src/*.deps.json` **必须随包发布**（见 `package.json#files`）——tsup 只打包代码，规则数据是运行时读取的。

### 框架与特性的关键分支

- **framework**：`next` | `vite` | `fallback`（fallback = vite 配置 + recommended 预设）。
- `registerReact = framework !== 'next'`：Next.js 走 `eslint-config-next` 提供的 react 规则，所以不单独注册 `eslint-plugin-react`；vite / fallback 才注册。
- `reactRefreshPreset` 随框架取 `reactRefresh.configs.{next|vite|recommended}`。
- Next 专属：额外拼入 `nextVitals` / `nextTs` 预设，以及按文件名生效的 **Service 层（`*.service.ts`）/ Action 层（`*.action.ts`）架构约束**（用 `no-restricted-syntax` AST selector 强制 async、try-catch、命名后缀，见 `next.rule.jsonc`）。
- **features**：`yml` / `mdx` / `json` 三个可选的文件类型格式化块，各自决定是否拼入对应 render 块、是否加入对应 import key、是否引入 peer 依赖。
- 依赖版本来自 `src/next.deps.json` 或 `src/vite.deps.json`（按框架选表）。

### 改动指南

- **改某条 lint 规则**：编辑 `src/rules/*.rule.jsonc`，不要动 `build.ts`。
- **新增一个插件/import**：在 `registry.ts` 三张表里登记，再在 `build.ts` 的 `collectImportKeys` 与相应 render 块里接入，并在 `*.deps.json` 补版本。
- **改生成文件的结构骨架**（块顺序、注释、scaffolding）：改 `build.ts` 里的 `render*()` 模板字符串。
- 改完务必跑一遍 fixture 验证（build → test/\* config → lint），确认生成的 `eslint.config.mjs` 本身能通过 eslint。
