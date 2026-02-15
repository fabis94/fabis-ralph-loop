import { loadConfig } from 'c12'
import { ralphLoopConfigSchema } from './schema.js'
import { applyPlaywrightDefaults } from './defaults.js'
import { mergeConfigs } from './merge.js'
import type { RalphLoopConfig, ResolvedConfig } from './schema.js'

export async function loadRalphConfig(cwd?: string): Promise<ResolvedConfig> {
  const { config: baseConfig } = await loadConfig<RalphLoopConfig>({
    name: 'fabis-ralph-loop',
    cwd,
  })

  if (!baseConfig || Object.keys(baseConfig).length === 0) {
    throw new Error('No fabis-ralph-loop config found. Run `fabis-ralph-loop init` to create one.')
  }

  const { config: overridesConfig } = await loadConfig<Partial<RalphLoopConfig>>({
    name: 'fabis-ralph-loop.overrides',
    cwd,
  })

  const merged =
    overridesConfig && Object.keys(overridesConfig).length > 0
      ? mergeConfigs(baseConfig, overridesConfig as RalphLoopConfig)
      : baseConfig

  const parsed = ralphLoopConfigSchema.safeParse(merged)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    const suffix =
      overridesConfig && Object.keys(overridesConfig).length > 0 ? ' (after merging overrides)' : ''
    throw new Error(`Invalid fabis-ralph-loop config${suffix}:\n${issues}`)
  }

  return applyPlaywrightDefaults(parsed.data)
}
