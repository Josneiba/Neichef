import { existsSync, readFileSync } from 'fs'

function loadDotenvLike(path: string) {
  try {
    const src = readFileSync(path, 'utf8')
    for (const line of src.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    // ignore
  }
}

// Prefer .env.test, fall back to .env.local for local dev
const paths = ['.env.test', '.env.local', '.env']
for (const p of paths) {
  if (existsSync(p)) {
    loadDotenvLike(p)
    break
  }
}
