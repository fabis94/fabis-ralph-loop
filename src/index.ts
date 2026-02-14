export { ralphLoopConfigSchema } from './config/schema.js'
export type { RalphLoopConfig, ResolvedConfig, BackpressureCommand } from './config/schema.js'
export { loadRalphConfig } from './config/loader.js'
export { generateAll } from './generators/index.js'

/**
 * Helper for defining a typed ralph-loop config.
 */
export function defineConfig(config: import('./config/schema.js').RalphLoopConfig) {
  return config
}
