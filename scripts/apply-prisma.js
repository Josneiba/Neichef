#!/usr/bin/env node
const { spawnSync } = require('child_process')

function log(...args) {
  console.log('[apply-prisma]', ...args)
}

const auto = process.env.AUTO_APPLY_PRISMA === 'true'
if (!auto) {
  log('AUTO_APPLY_PRISMA not set to true — skipping automatic prisma apply.')
  process.exit(0)
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  log('DATABASE_URL not set — cannot apply schema. Exiting.')
  process.exit(1)
}

log('Applying Prisma schema to database...')
const push = spawnSync('pnpm', ['exec', 'prisma', 'db', 'push', '--accept-data-loss', '--url', dbUrl], { stdio: 'inherit' })
if (push.error || push.status !== 0) {
  log('prisma db push failed', push.error || `exit ${push.status}`)
  process.exit(push.status || 1)
}

log('Generating Prisma client...')
const gen = spawnSync('pnpm', ['exec', 'prisma', 'generate'], { stdio: 'inherit' })
if (gen.error || gen.status !== 0) {
  log('prisma generate failed', gen.error || `exit ${gen.status}`)
  process.exit(gen.status || 1)
}

log('Prisma apply + generate completed successfully.')
