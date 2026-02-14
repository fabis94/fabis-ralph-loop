import type { ResolvedConfig } from './schema.js'

/**
 * Apply Playwright-specific defaults when playwright is enabled.
 * Merges SYS_ADMIN capability and 2gb shm_size if not already set.
 */
export function applyPlaywrightDefaults(config: ResolvedConfig): ResolvedConfig {
  if (!config.container.playwright) return config

  const shmSize = config.container.shmSize === '64m' ? '2gb' : config.container.shmSize

  const capabilities = config.container.capabilities.includes('SYS_ADMIN')
    ? config.container.capabilities
    : [...config.container.capabilities, 'SYS_ADMIN']

  return {
    ...config,
    container: {
      ...config.container,
      shmSize,
      capabilities,
    },
  }
}
