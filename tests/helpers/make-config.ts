import { ralphLoopConfigSchema } from '../../src/config/schema.js'
import { applyPlaywrightDefaults } from '../../src/config/defaults.js'

export function makeConfig(overrides: Record<string, unknown> = {}) {
  return applyPlaywrightDefaults(
    ralphLoopConfigSchema.parse({ project: { name: 'Test' }, ...overrides }),
  )
}

export function makeRawConfig(overrides: Record<string, unknown> = {}) {
  return ralphLoopConfigSchema.parse({
    project: { name: 'Test' },
    ...overrides,
  })
}
