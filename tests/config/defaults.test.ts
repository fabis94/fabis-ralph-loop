import { describe, it, expect } from 'vitest'
import { applyPlaywrightDefaults } from '../../src/config/defaults.js'
import { makeRawConfig } from '../helpers/make-config.js'

describe('applyPlaywrightDefaults', () => {
  it('does nothing when playwright is false', () => {
    const config = makeRawConfig()
    const result = applyPlaywrightDefaults(config)
    expect(result.container.shmSize).toBe('64m')
    expect(result.container.capabilities).toEqual([])
  })

  it('sets shmSize to 2gb when playwright is "cli" and shmSize is default', () => {
    const config = makeRawConfig({ container: { name: 'test', playwright: true } })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.shmSize).toBe('2gb')
  })

  it('sets shmSize to 2gb when playwright is "mcp" and shmSize is default', () => {
    const config = makeRawConfig({ container: { name: 'test', playwright: 'mcp' } })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.shmSize).toBe('2gb')
  })

  it('preserves custom shmSize when playwright is enabled', () => {
    const config = makeRawConfig({
      container: { name: 'test', playwright: true, shmSize: '4gb' },
    })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.shmSize).toBe('4gb')
  })

  it('adds SYS_ADMIN capability when playwright is "cli"', () => {
    const config = makeRawConfig({ container: { name: 'test', playwright: true } })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.capabilities).toContain('SYS_ADMIN')
  })

  it('adds SYS_ADMIN capability when playwright is "mcp"', () => {
    const config = makeRawConfig({ container: { name: 'test', playwright: 'mcp' } })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.capabilities).toContain('SYS_ADMIN')
  })

  it('does not duplicate SYS_ADMIN if already present', () => {
    const config = makeRawConfig({
      container: { name: 'test', playwright: true, capabilities: ['SYS_ADMIN'] },
    })
    const result = applyPlaywrightDefaults(config)
    expect(result.container.capabilities.filter((c) => c === 'SYS_ADMIN')).toHaveLength(1)
  })
})
