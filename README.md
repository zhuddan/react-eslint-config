# @zdecode/react-eslint-config

交互式 CLI 脚手架，为 React 项目一键生成自包含的 ESLint flat config。

支持 **Next.js**、**Vite**、通用框架，可选 YAML / MDX / JSON 格式化。

---

## 特点

- **脚手架而非共享配置** — 运行后在你的项目里生成一个完整的 `eslint.config.mjs`，不依赖本包，可随意修改
- **依赖按需写入** — 自动把缺失的插件追加到项目 `package.json#devDependencies`，只写版本，不执行安装
- **框架感知** — Next.js 走 `eslint-config-next`，Vite / 通用框架单独注册 `eslint-plugin-react`
- **架构约束（Next.js 专属）** — 通过 `no-restricted-syntax` AST 规则强制 Service / Action 层命名与结构规范

---

## 快速开始

在项目根目录（有 `package.json` 的地方）运行：

```bash
npx @zdecode/react-eslint-config
```

CLI 会交互式询问框架类型和可选格式化文件类型，然后生成 `eslint.config.mjs` 并更新 `package.json`。

完成后执行安装：

```bash
pnpm install   # 或 npm install / yarn
```

---

## 非交互用法

适合脚本、CI、或 fixture 初始化场景：

| 参数                                 | 说明                               |
| ------------------------------------ | ---------------------------------- |
| `--framework <next\|vite\|fallback>` | 指定框架（必填时跳过交互）         |
| `--features <yml,mdx,json>`          | 指定要启用的格式化，逗号分隔       |
| `--all`                              | 启用全部格式化（yml + mdx + json） |
| `--none`                             | 不启用任何格式化                   |

示例：

```bash
# Next.js，启用全部格式化
npx @zdecode/react-eslint-config --framework next --all

# Vite，只启用 JSON
npx @zdecode/react-eslint-config --framework vite --features json

# 通用框架，不启用额外格式化
npx @zdecode/react-eslint-config --framework fallback --none
```

---

## 框架说明

| 框架       | 说明                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `next`     | 使用 `eslint-config-next`（Core Web Vitals + TypeScript 规则集），不单独注册 `eslint-plugin-react` |
| `vite`     | 单独注册 `eslint-plugin-react`，使用 `reactRefresh.configs.vite`                                   |
| `fallback` | 同 vite 配置，但 react-refresh 使用 `recommended` 预设，适合非 Vite 构建工具                       |

---

## 生成的配置包含

**核心（始终包含）**

- `@eslint/js` recommended
- `typescript-eslint` recommended
- `@stylistic/eslint-plugin` — 代码风格（缩进、引号、分号、JSX 格式等）
- `@eslint-react/eslint-plugin` — React 最佳实践
- `eslint-plugin-react-hooks` — Hooks 规则
- `eslint-plugin-react-refresh` — HMR 安全导出检查
- 全局忽略：`dist`、`build`、`out`、`node_modules`、锁文件等

**可选格式化**

| 特性   | 文件类型                      | 插件                                                     |
| ------ | ----------------------------- | -------------------------------------------------------- |
| `yml`  | `.yml` / `.yaml`              | `eslint-plugin-yml`                                      |
| `mdx`  | `.md` / `.mdx`                | `eslint-plugin-mdx` + `eslint-plugin-format`（Prettier） |
| `json` | `.json` / `.jsonc` / `.json5` | `eslint-plugin-jsonc`                                    |

**Next.js 专属**

- Service 层（`*.service.ts`）：导出函数必须 `async`、包含 `try-catch`、命名以 `Service` 结尾
- Action 层（`*.action.ts`）：导出异步函数命名必须以 `Action` 结尾

---

## 注意事项

- 运行前若项目已存在 `eslint.config.js` / `eslint.config.mjs` / `eslint.config.cjs` / `eslint.config.ts`，脚手架会中止以防覆盖
- 用户 `package.json` 中已声明的依赖版本会被保留，不会被覆盖
- 生成的文件直接 import 各 ESLint 插件，**不会 import 本包**，删除本包不影响运行

---

## License

ISC
