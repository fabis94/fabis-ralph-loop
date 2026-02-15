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

describe('loadRalphConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockApplyDefaults.mockImplementation((config: unknown) => config as never)
  })

  it('returns resolved config for valid input', async () => {
    const validConfig = { project: { name: 'Test' } }
    mockLoadConfig.mockResolvedValue({ config: validConfig } as never)

    const result = await loadRalphConfig()

    expect(result).toMatchObject({ project: { name: 'Test' } })
  })

  it('calls applyPlaywrightDefaults on parsed config', async () => {
    const validConfig = { project: { name: 'Test' } }
    mockLoadConfig.mockResolvedValue({ config: validConfig } as never)

    await loadRalphConfig()

    const expectedParsed = ralphLoopConfigSchema.parse(validConfig)
    expect(mockApplyDefaults).toHaveBeenCalledWith(expectedParsed)
  })

  it('passes cwd to c12 loadConfig', async () => {
    const validConfig = { project: { name: 'Test' } }
    mockLoadConfig.mockResolvedValue({ config: validConfig } as never)

    await loadRalphConfig('/custom/dir')

    expect(mockLoadConfig).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/custom/dir', name: 'fabis-ralph-loop' }),
    )
  })

  it('throws on missing config', async () => {
    mockLoadConfig.mockResolvedValue({ config: {} } as never)

    await expect(loadRalphConfig()).rejects.toThrow(
      'No fabis-ralph-loop config found. Run `fabis-ralph-loop init` to create one.',
    )
  })

  it('throws on null config', async () => {
    mockLoadConfig.mockResolvedValue({ config: null } as never)

    await expect(loadRalphConfig()).rejects.toThrow('No fabis-ralph-loop config found')
  })

  it('throws on invalid config with Zod issue details', async () => {
    mockLoadConfig.mockResolvedValue({
      config: { project: { name: '' } },
    } as never)

    await expect(loadRalphConfig()).rejects.toThrow('Invalid fabis-ralph-loop config')
  })
})
