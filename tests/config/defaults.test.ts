import { describe, it, expect } from 'vitest'
import { ralphLoopConfigSchema } from '../../src/config/schema.js'
import { applyPlaywrightDefaults } from '../../src/config/defaults.js'

function makeConfig(overrides: Record<string, unknown> = {}) {
  return ralphLoopConfigSchema.parse({
    project: { name: 'Test' },
    ...overrides,
  })
}

describe('applyPlaywrightDefaults', () => {
  it('does nothing when playwright is false', () => {
    const config = makeConfig()
    const result = applyPlaywrightDefaults(config)
    expect(result.container.shmSize).toBe('64m')
    expect(result.container.capabilities).toEqual([])
  })

  it('sets shmSize to 2gb when playwright is true and shmSize is default', () => {
    const config = makeConfig({ container: { name: 'test', playwright: true } })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.shmSize).toBe('2gb')
  })

  it('preserves custom shmSize when playwright is true', () => {
    const config = makeConfig({
      container: { name: 'test', playwright: true, shmSize: '4gb' },
    })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.shmSize).toBe('4gb')
  })

  it('adds SYS_ADMIN capability when playwright is true', () => {
    const config = makeConfig({ container: { name: 'test', playwright: true } })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.capabilities).toContain('SYS_ADMIN')
  })

  it('does not duplicate SYS_ADMIN if already present', () => {
    const config = makeConfig({
      container: { name: 'test', playwright: true, capabilities: ['SYS_ADMIN'] },
    })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.capabilities.filter((c) => c === 'SYS_ADMIN')).toHaveLength(1)
  })
})
