const fs = require('fs')
const path = require('path')

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walk(full)
    else if (e.isFile() && full.endsWith('.js')) await stripFile(full)
  }
}

async function stripFile(file) {
  try {
    let s = await fs.promises.readFile(file, 'utf8')
    const original = s
    s = s.replace(/(^|\n)\/\/#[ \t]*sourceMappingURL=.*$/gm, '')
    s = s.replace(/(^|\n)\/\*#\s*sourceMappingURL=[\s\S]*?\*\//gm, '')
    if (s !== original) {
      await fs.promises.writeFile(file, s, 'utf8')
      console.log('Stripped sourceMappingURL in', file)
    }
  } catch (err) {
    // ignore
  }
}

async function main() {
  const target = process.argv[2] || '.next/dev/server/chunks/ssr'
  if (!fs.existsSync(target)) {
    console.error('Target not found:', target)
    process.exit(0)
  }
  await walk(target)
}

main().catch((e) => { console.error(e); process.exit(1) })
