export { ralphLoopConfigSchema } from './config/schema.js'
export type { RalphLoopConfig, ResolvedConfig, BackpressureCommand } from './config/schema.js'
export { loadRalphConfig } from './config/loader.js'
export { generateAll } from './generators/index.js'
export { mergeConfigs } from './config/merge.js'
export { ensureGitignoreBlock } from './utils/gitignore.js'

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T

/**
 * Helper for defining a typed ralph-loop config.
 */
export function defineConfig(config: import('./config/schema.js').RalphLoopConfig) {
  return config
}

/**
 * Helper for defining a typed ralph-loop overrides config.
 * All fields are optional — only specify what you want to override.
 */
export function defineOverridesConfig(
  config: DeepPartial<import('./config/schema.js').RalphLoopConfig>,
) {
  return config
}
