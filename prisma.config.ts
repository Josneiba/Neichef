import { defineConfig, env } from 'prisma/config'
import { existsSync, readFileSync } from 'node:fs'

function loadEnvFile(path: string) {
	if (!existsSync(path)) return
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
		if (!match || process.env[match[1]]) continue
		process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
	}
}

loadEnvFile('.env')
loadEnvFile('.env.local')

export default defineConfig({
	schema: 'prisma/schema.prisma',
	datasource: {
		url: env('DATABASE_URL'),
		shadowDatabaseUrl: process.env.DIRECT_URL ? env('DIRECT_URL') : undefined,
	},
})
