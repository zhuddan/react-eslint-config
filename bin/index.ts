#!/usr/bin/env node
// @zd~/react-eslint-config 初始化脚本
// 触发：npx @zd~/react-eslint-config
// 作用：① 让用户选择框架与要格式化的模块
//       ② 拼装出一个自包含的 eslint.config.mjs（不 import 本包）
//       ③ 按需把所需依赖补齐到用户 package.json（不执行安装）
import fs from 'node:fs'
import path from 'node:path'
import * as p from '@clack/prompts'
import { type Features, type Framework, assemble } from '../src/build'

type FeatureKey = 'yml' | 'mdx' | 'json'
const ALL_FEATURES: FeatureKey[] = ['yml', 'mdx', 'json']
const cwd = process.cwd()

function bail(msg: string): never {
  p.cancel(msg)
  process.exit(1)
}

function guardCancel<T>(value: T | symbol): T {
  if (p.isCancel(value))
    bail('已取消。')
  return value as T
}

// 非交互参数：--framework <vite|next|fallback>、--features <a,b> | --all | --none
const argv = process.argv.slice(2)
function flagValue(name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`)
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--'))
    return argv[idx + 1]
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.slice(name.length + 3) : undefined
}
const hasFlag = (name: string): boolean => argv.includes(`--${name}`)

// 选择框架与格式化模块：传了 --framework 即非交互，否则走 clack 交互
async function resolveSelection(): Promise<{ framework: Framework, selected: FeatureKey[] }> {
  const cliFramework = flagValue('framework')

  if (cliFramework) {
    if (cliFramework !== 'vite' && cliFramework !== 'next' && cliFramework !== 'fallback')
      bail(`未知的 --framework 值：${cliFramework}（可选 vite | next | fallback）`)
    const featuresArg = flagValue('features')
    let selected: FeatureKey[]
    if (hasFlag('none'))
      selected = []
    else if (featuresArg)
      selected = featuresArg.split(',').map((s) => s.trim()).filter((s): s is FeatureKey => (ALL_FEATURES as string[]).includes(s))
    else
      selected = ALL_FEATURES // 默认 / --all
    return { framework: cliFramework, selected }
  }

  // 交互模式
  const framework = guardCancel(await p.select<Framework>({
    message: '选择项目类型',
    initialValue: 'vite',
    options: [
      { value: 'vite', label: 'Vite' },
      { value: 'next', label: 'Next.js' },
      { value: 'fallback', label: '通用 / 其他', hint: 'Vite 配置 + recommended 预设' },
    ],
  }))
  const selected = guardCancel(await p.multiselect<FeatureKey>({
    message: '选择需要额外格式化的文件类型（空格切换，回车确认）',
    required: false,
    initialValues: ['yml', 'mdx', 'json'],
    options: [
      { value: 'yml', label: 'YAML', hint: '.yml / .yaml' },
      { value: 'mdx', label: 'Markdown / MDX', hint: '.md / .mdx' },
      { value: 'json', label: 'JSON', hint: '.json / .jsonc / .json5' },
    ],
  }))
  return { framework, selected }
}

async function main(): Promise<void> {
  p.intro('@zd~/react-eslint-config')

  // 0. 最先检查已存在的 ESLint 配置
  for (const name of ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts']) {
    if (fs.existsSync(path.join(cwd, name)))
      bail(`检测到项目已存在 ${name}，为避免覆盖已终止。请先删除后再运行。`)
  }

  // 1 + 2. 框架与格式化模块
  const { framework, selected } = await resolveSelection()
  const features: Features = {
    yml: selected.includes('yml'),
    mdx: selected.includes('mdx'),
    json: selected.includes('json'),
  }

  // 3. 拼装单文件 + 推导依赖
  const { content, deps } = assemble({ framework, features })

  // 4. 写文件 + 改 package.json
  const userPkgPath = path.join(cwd, 'package.json')
  if (!fs.existsSync(userPkgPath))
    bail('当前目录下找不到 package.json，请在项目根目录运行。')

  let userPkg: Record<string, unknown>
  try {
    userPkg = JSON.parse(fs.readFileSync(userPkgPath, 'utf8'))
  }
  catch {
    bail('package.json 解析失败，请检查 JSON 格式。')
  }

  const existingDeps = userPkg.dependencies as Record<string, string> | undefined
  const existingDevDeps = userPkg.devDependencies as Record<string, string> | undefined
  const userDeps = { ...existingDeps, ...existingDevDeps }
  const devDeps: Record<string, string> = { ...existingDevDeps }
  const added: string[] = []
  for (const [name, version] of Object.entries(deps)) {
    // 用户已声明则保留其版本
    if (name in userDeps)
      continue
    devDeps[name] = version
    added.push(name)
  }
  const sortedDevDeps: Record<string, string> = {}
  for (const key of Object.keys(devDeps).sort())
    sortedDevDeps[key] = devDeps[key]
  userPkg.devDependencies = sortedDevDeps

  const scripts = (userPkg.scripts ?? {}) as Record<string, string>
  if (!('lint' in scripts))
    scripts.lint = 'eslint .'
  if (!('lint:fix' in scripts))
    scripts['lint:fix'] = 'eslint . --fix'
  userPkg.scripts = scripts

  const s = p.spinner()
  s.start('正在写入文件')
  fs.writeFileSync(path.join(cwd, 'eslint.config.mjs'), content)
  fs.writeFileSync(userPkgPath, `${JSON.stringify(userPkg, null, 2)}\n`)
  s.stop('文件写入完成')

  // 5. 输出总结
  const frameworkLabel = framework === 'next' ? 'Next.js' : framework === 'vite' ? 'Vite' : '通用（recommended 预设）'
  const featureLabel = selected.length ? selected.join(' / ') : '无'
  p.log.success(`框架：${frameworkLabel} 格式化：${featureLabel}`)
  p.log.success('已生成：eslint.config.mjs')

  if (added.length) {
    const list = added
      .sort()
      .map((name) => `${name}  ${deps[name]}`)
      .join('\n')
    p.note(list, `已向 devDependencies 新增 ${added.length} 个依赖`)
  }
  else {
    p.log.info('所需依赖均已存在，未改动 devDependencies。')
  }

  p.outro('完成！下一步运行：pnpm install（或 npm install / yarn）')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
