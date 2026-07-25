#!/usr/bin/env node
const { spawnSync } = require('child_process')
const dotenv = require('dotenv')

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

function log(...args) {
  console.log('[apply-prisma]', ...args)
}

function normalizeDbUrl(url) {
  if (!url) return url
  if (url.includes('sslmode=')) return url
  if (process.env.PGSSLMODE === 'no-verify') {
    return `${url}${url.includes('?') ? '&' : '?'}sslmode=no-verify`
  }
  return url
}

function getPrismaScript() {
  const { join } = require('node:path')
  const paths = [join(__dirname, '..')]
  try {
    return require.resolve('prisma/build/index.js', { paths })
  } catch (error) {
    log('Cannot resolve Prisma entrypoint:', error.message)
    process.exit(1)
  }
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!dbUrl) {
  log('DIRECT_URL or DATABASE_URL not set — cannot apply schema. Exiting.')
  process.exit(1)
}

const normalizedUrl = normalizeDbUrl(dbUrl)
const prismaScript = getPrismaScript()
log('Applying Prisma schema to database...')
const push = spawnSync(process.execPath, [prismaScript, 'db', 'push', '--accept-data-loss', '--url', normalizedUrl], { stdio: 'inherit' })
if (push.error || push.status !== 0) {
  log('prisma db push failed', push.error || `exit ${push.status}`)
  process.exit(push.status || 1)
}

log('Generating Prisma client...')
const gen = spawnSync(process.execPath, [prismaScript, 'generate'], { stdio: 'inherit' })
if (gen.error || gen.status !== 0) {
  log('prisma generate failed', gen.error || `exit ${gen.status}`)
  process.exit(gen.status || 1)
}

log('Prisma apply + generate completed successfully.')
