import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))
vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
}))
vi.mock('../../src/config/loader.js', () => ({
  loadRalphConfig: vi.fn(),
}))
vi.mock('../../src/generators/index.js', () => ({
  generateAll: vi.fn(),
}))
vi.mock('consola', () => ({
  consola: { warn: vi.fn(), success: vi.fn() },
}))

import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { loadRalphConfig } from '../../src/config/loader.js'
import { generateAll } from '../../src/generators/index.js'
import { consola } from 'consola'
import { makeConfig } from '../helpers/make-config.js'

const mockExistsSync = vi.mocked(existsSync)
const mockWriteFile = vi.mocked(writeFile)
const mockLoadConfig = vi.mocked(loadRalphConfig)
const mockGenerateAll = vi.mocked(generateAll)

async function importInitCommand() {
  const mod = await import('../../src/commands/init.js')
  return mod.default
}

describe('init command', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    const config = makeConfig()
    mockLoadConfig.mockResolvedValue(config)
    mockGenerateAll.mockResolvedValue([] as never)
    mockWriteFile.mockResolvedValue()
  })

  it('creates config file when it does not exist', async () => {
    mockExistsSync.mockReturnValue(false)

    const cmd = await importInitCommand()
    await cmd.run!({ args: {}, rawArgs: [], cmd } as never)

    expect(mockWriteFile).toHaveBeenCalledWith(
      'fabis-ralph-loop.config.ts',
      expect.stringContaining('defineConfig'),
      'utf8',
    )
    expect(consola.success).toHaveBeenCalledWith(expect.stringContaining('Created'))
  })

  it('skips config creation when file already exists', async () => {
    mockExistsSync.mockReturnValue(true)

    const cmd = await importInitCommand()
    await cmd.run!({ args: {}, rawArgs: [], cmd } as never)

    expect(mockWriteFile).not.toHaveBeenCalledWith(
      'fabis-ralph-loop.config.ts',
      expect.anything(),
      expect.anything(),
    )
    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'))
  })

  it('loads config and generates files', async () => {
    mockExistsSync.mockReturnValue(false)

    const cmd = await importInitCommand()
    await cmd.run!({ args: {}, rawArgs: [], cmd } as never)

    expect(mockLoadConfig).toHaveBeenCalled()
    expect(mockGenerateAll).toHaveBeenCalled()
  })

  it('shows completion message', async () => {
    mockExistsSync.mockReturnValue(false)

    const cmd = await importInitCommand()
    await cmd.run!({ args: {}, rawArgs: [], cmd } as never)

    expect(consola.success).toHaveBeenCalledWith(expect.stringContaining('Init complete'))
  })
})
