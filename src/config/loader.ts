import { loadConfig } from 'c12'
import { consola } from 'consola'
import { ralphLoopConfigSchema } from './schema.js'
import { applyPlaywrightDefaults } from './defaults.js'
import type { RalphLoopConfig, ResolvedConfig } from './schema.js'

export async function loadRalphConfig(cwd?: string): Promise<ResolvedConfig> {
  const { config } = await loadConfig<RalphLoopConfig>({
    name: 'ralph-loop',
    cwd,
  })

  if (!config || Object.keys(config).length === 0) {
    consola.error('No ralph-loop config found. Run `fabis-ralph-loop init` to create one.')
    process.exit(1)
  }

  const parsed = ralphLoopConfigSchema.safeParse(config)
  if (!parsed.success) {
    consola.error('Invalid ralph-loop config:')
    for (const issue of parsed.error.issues) {
      consola.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }

  return applyPlaywrightDefaults(parsed.data)
}
