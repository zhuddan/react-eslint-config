#!/usr/bin/env node
// @zd~/react-eslint-config 初始化脚本
// 触发：npx @zd~/react-eslint-config
// 作用：① 复制合适的 ESLint flat config 到用户的 eslint.config.mjs
//       ② 把该 config 运行所需的依赖补齐到用户的 package.json（不执行安装）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 模板文件位于本包根目录（bin 的上一级）
const pkgRoot = path.resolve(__dirname, '..')
const cwd = process.cwd()

// 未被 import 直接引用、但 config 运行必需的 peer 依赖
const PEER_DEPS = ['typescript', 'yaml-eslint-parser']

// 终止并退出（取消或出错）
function bail(msg) {
  p.cancel(msg)
  process.exit(1)
}

// 处理用户按 Ctrl+C / Esc 取消
function guardCancel(value) {
  if (p.isCancel(value))
    bail('已取消。')
  return value
}

p.intro('@zd~/react-eslint-config')

// ---------------------- 0. 最先检查已存在的 ESLint 配置 ----------------------
for (const name of ['eslint.config.js', 'eslint.config.mjs']) {
  if (fs.existsSync(path.join(cwd, name)))
    bail(`检测到项目已存在 ${name}，为避免覆盖已终止。请先删除后再运行。`)
}

// ---------------------- 1. 读取用户 package.json ----------------------
const userPkgPath = path.join(cwd, 'package.json')
if (!fs.existsSync(userPkgPath))
  bail('当前目录下找不到 package.json，请在项目根目录运行。')

const userPkgRaw = fs.readFileSync(userPkgPath, 'utf8')
let userPkg
try {
  userPkg = JSON.parse(userPkgRaw)
}
catch {
  bail('package.json 解析失败，请检查 JSON 格式。')
}

const userDeps = { ...userPkg.dependencies, ...userPkg.devDependencies }

// ---------------------- 2. 自动检测项目类型 ----------------------
// next > vite > fallback（fallback 用 vite 配置，但改用 recommended 预设）
let detected
if ('next' in userDeps)
  detected = 'next'
else if ('vite' in userDeps)
  detected = 'vite'
else
  detected = 'fallback'

// ---------------------- 2.1 交互菜单：确认 / 覆盖项目类型 ----------------------
const kind = guardCancel(await p.select({
  message: `选择项目类型（已自动检测为 ${detected}）`,
  initialValue: detected,
  options: [
    { value: 'next', label: 'Next.js', hint: 'eslint.next.config.js' },
    { value: 'vite', label: 'Vite', hint: 'eslint.vite.config.js' },
    { value: 'fallback', label: '通用 / 其他', hint: 'Vite 配置 + recommended 预设' },
  ],
}))

// ---------------------- 3. 选定模板 ----------------------
const isNext = kind === 'next'
const configTemplate = path.join(pkgRoot, isNext ? 'eslint.next.config.js' : 'eslint.vite.config.js')
const pkgTemplatePath = path.join(pkgRoot, isNext ? 'next.deps.json' : 'vite.deps.json')

if (!fs.existsSync(configTemplate) || !fs.existsSync(pkgTemplatePath))
  bail('包内模板文件缺失，安装可能不完整，请重新安装本包。')

// ---------------------- 4. 读取 config 文本（fallback 时替换预设） ----------------------
let configContent = fs.readFileSync(configTemplate, 'utf8')
if (kind === 'fallback') {
  configContent = configContent.replace(
    /reactRefresh\.configs\.vite/g,
    'reactRefresh.configs.recommended',
  )
}

// ---------------------- 6. 从 config 推导所需依赖包名 ----------------------
// 合法 npm 包名（可带 scope），用于过滤注释/字符串里误匹配到的内容
const VALID_PKG = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i

function specifierToPackage(spec) {
  // node: 内置模块跳过
  if (spec.startsWith('node:'))
    return null
  const parts = spec.split('/')
  // @scope/name 取前两段；否则取首段
  const name = spec.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
  // 过滤注释/字符串里误匹配到的内容（如 from '...'）
  return VALID_PKG.test(name) ? name : null
}

// 去掉注释，避免误把注释里的 `from '...'` 当成 import（保留字符串里的 :// ）
function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '') // 块注释
    .replace(/(^|[^:])\/\/.*$/gm, '$1') // 行注释（避开 https://）
}

function collectPackages(content) {
  const names = new Set()
  // 匹配 `from '...'` 与 `import '...'`（单/双引号）
  const re = /(?:from|import)\s+['"]([^'"]+)['"]/g
  const src = stripComments(content)
  let m
  while ((m = re.exec(src)) !== null) {
    const name = specifierToPackage(m[1])
    if (name)
      names.add(name)
  }
  return names
}

const needed = collectPackages(configContent)
for (const dep of PEER_DEPS)
  needed.add(dep)

// ---------------------- 7. 从模板 package.json 解析版本 ----------------------
const pkgTemplate = JSON.parse(fs.readFileSync(pkgTemplatePath, 'utf8'))
const templateDeps = { ...pkgTemplate.dependencies, ...pkgTemplate.devDependencies }

const resolved = {}
const missing = []
for (const name of needed) {
  if (templateDeps[name])
    resolved[name] = templateDeps[name]
  else
    missing.push(name)
}
for (const name of missing)
  p.log.warn(`模板中找不到依赖 ${name} 的版本，已跳过。`)

// ---------------------- 8. 合并进用户 devDependencies（保留已有版本） ----------------------
const devDeps = { ...userPkg.devDependencies }
const added = []
for (const [name, version] of Object.entries(resolved)) {
  // 用户的 dependencies / devDependencies 已声明则跳过，保留其版本
  if (name in userDeps)
    continue
  devDeps[name] = version
  added.push(name)
}

// 按键名排序（与 npm/pnpm install 写回行为一致）
const sortedDevDeps = {}
for (const key of Object.keys(devDeps).sort())
  sortedDevDeps[key] = devDeps[key]
userPkg.devDependencies = sortedDevDeps

// ---------------------- 5 + 9. 写文件 ----------------------
const s = p.spinner()
s.start('正在写入文件')
fs.writeFileSync(path.join(cwd, 'eslint.config.mjs'), configContent)
fs.writeFileSync(userPkgPath, `${JSON.stringify(userPkg, null, 2)}\n`)
s.stop('文件写入完成')

// ---------------------- 10. 输出总结 ----------------------
const kindLabel = kind === 'next' ? 'Next.js' : kind === 'vite' ? 'Vite' : '通用（Vite 配置 + recommended 预设）'
p.log.success(`项目类型：${kindLabel}`)
p.log.success('已生成：eslint.config.mjs')

if (added.length) {
  const list = added
    .sort()
    .map((name) => `${name}  ${resolved[name]}`)
    .join('\n')
  p.note(list, `已向 devDependencies 新增 ${added.length} 个依赖`)
}
else {
  p.log.info('所需依赖均已存在，未改动 devDependencies。')
}

p.outro('完成！下一步运行：pnpm install（或 npm install / yarn）')
