import { loadConfig } from 'c12'
import { ralphLoopConfigSchema } from './schema.js'
import { applyPlaywrightDefaults } from './defaults.js'
import type { RalphLoopConfig, ResolvedConfig } from './schema.js'

export async function loadRalphConfig(cwd?: string): Promise<ResolvedConfig> {
  const { config } = await loadConfig<RalphLoopConfig>({
    name: 'fabis-ralph-loop',
    cwd,
  })

  if (!config || Object.keys(config).length === 0) {
    throw new Error('No fabis-ralph-loop config found. Run `fabis-ralph-loop init` to create one.')
  }

  const parsed = ralphLoopConfigSchema.safeParse(config)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid fabis-ralph-loop config:\n${issues}`)
  }

  return applyPlaywrightDefaults(parsed.data)
}
