import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('c12', () => ({
  loadConfig: vi.fn(),
}))
vi.mock('../../src/config/defaults.js', () => ({
  applyPlaywrightDefaults: vi.fn((config: unknown) => config),
}))

import { loadConfig } from 'c12'
import { applyPlaywrightDefaults } from '../../src/config/defaults.js'
import { loadRalphConfig } from '../../src/config/loader.js'
import { ralphLoopConfigSchema } from '../../src/config/schema.js'

const mockLoadConfig = vi.mocked(loadConfig)
const mockApplyDefaults = vi.mocked(applyPlaywrightDefaults)

/** Helper: mock base config (first call) and overrides (second call) */
function mockConfigs(base: unknown, overrides: unknown = {}) {
  mockLoadConfig
    .mockResolvedValueOnce({ config: base } as never)
    .mockResolvedValueOnce({ config: overrides } as never)
}

describe('loadRalphConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockApplyDefaults.mockImplementation((config: unknown) => config as never)
  })

  it('returns resolved config for valid input', async () => {
    const validConfig = { project: { name: 'Test' } }
    mockConfigs(validConfig)

    const result = await loadRalphConfig()

    expect(result).toMatchObject({ project: { name: 'Test' } })
  })

  it('calls applyPlaywrightDefaults on parsed config', async () => {
    const validConfig = { project: { name: 'Test' } }
    mockConfigs(validConfig)

    await loadRalphConfig()

    const expectedParsed = ralphLoopConfigSchema.parse(validConfig)
    expect(mockApplyDefaults).toHaveBeenCalledWith(expectedParsed)
  })

  it('passes cwd to c12 loadConfig for both base and overrides', async () => {
    const validConfig = { project: { name: 'Test' } }
    mockConfigs(validConfig)

    await loadRalphConfig('/custom/dir')

    expect(mockLoadConfig).toHaveBeenCalledTimes(2)
    expect(mockLoadConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ cwd: '/custom/dir', name: 'fabis-ralph-loop' }),
    )
    expect(mockLoadConfig).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cwd: '/custom/dir', name: 'fabis-ralph-loop.overrides' }),
    )
  })

  it('throws on missing config', async () => {
    mockConfigs({})

    await expect(loadRalphConfig()).rejects.toThrow(
      'No fabis-ralph-loop config found. Run `fabis-ralph-loop init` to create one.',
    )
  })

  it('throws on null config', async () => {
    mockConfigs(null)

    await expect(loadRalphConfig()).rejects.toThrow('No fabis-ralph-loop config found')
  })

  it('throws on invalid config with Zod issue details', async () => {
    mockConfigs({ project: { name: '' } })

    await expect(loadRalphConfig()).rejects.toThrow('Invalid fabis-ralph-loop config')
  })
})

describe('loadRalphConfig with overrides', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockApplyDefaults.mockImplementation((config: unknown) => config as never)
  })

  it('merges overrides on top of base config', async () => {
    mockConfigs(
      { project: { name: 'Test' }, defaults: { model: 'sonnet' } },
      { defaults: { model: 'opus' } },
    )

    const result = await loadRalphConfig()

    expect(result.defaults.model).toBe('opus')
    expect(result.project.name).toBe('Test')
  })

  it('works when no overrides file exists', async () => {
    mockConfigs({ project: { name: 'Test' } }, {})

    const result = await loadRalphConfig()

    expect(result.project.name).toBe('Test')
  })

  it('works when overrides config is null', async () => {
    mockConfigs({ project: { name: 'Test' } }, null)

    const result = await loadRalphConfig()

    expect(result.project.name).toBe('Test')
  })

  it('includes "after merging overrides" in error when overrides cause invalid config', async () => {
    mockConfigs({ project: { name: 'Test' } }, { project: { name: '' } })

    await expect(loadRalphConfig()).rejects.toThrow('after merging overrides')
  })

  it('does not include "after merging overrides" when base config is invalid without overrides', async () => {
    mockConfigs({ project: { name: '' } })

    await expect(loadRalphConfig()).rejects.toThrow('Invalid fabis-ralph-loop config:')
    await expect(loadRalphConfig()).rejects.not.toThrow('after merging overrides')
  })

  it('deep merges nested container settings', async () => {
    mockConfigs(
      {
        project: { name: 'Test' },
        container: {
          name: 'base',
          systemPackages: ['git'],
          hooks: { rootSetup: ['RUN apt-get update'] },
        },
      },
      {
        container: {
          systemPackages: ['ripgrep'],
        },
      },
    )

    const result = await loadRalphConfig()

    expect(result.container.name).toBe('base')
    expect(result.container.systemPackages).toEqual(['ripgrep'])
    expect(result.container.hooks.rootSetup).toEqual(['RUN apt-get update'])
  })
})
