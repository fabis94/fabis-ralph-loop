import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/loader.js', () => ({
  loadRalphConfig: vi.fn(),
}))
vi.mock('../../src/loop/runner.js', () => ({
  runLoop: vi.fn(),
}))

import { loadRalphConfig } from '../../src/config/loader.js'
import { runLoop } from '../../src/loop/runner.js'
import { makeConfig } from '../helpers/make-config.js'

const mockLoadConfig = vi.mocked(loadRalphConfig)
const mockRunLoop = vi.mocked(runLoop)

// citty defineCommand returns an object with a `run` function we can call directly
async function importRunCommand() {
  const mod = await import('../../src/commands/run.js')
  return mod.default
}

describe('run command', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    const config = makeConfig()
    mockLoadConfig.mockResolvedValue(config)
    mockRunLoop.mockResolvedValue()
  })

  it('parses iterations and calls runLoop', async () => {
    const cmd = await importRunCommand()
    await cmd.run!({ args: { iterations: '3' }, rawArgs: [], cmd } as never)

    expect(mockRunLoop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ iterations: 3 }),
    )
  })

  it('throws on non-numeric iterations', async () => {
    const cmd = await importRunCommand()

    await expect(
      cmd.run!({ args: { iterations: 'abc' }, rawArgs: [], cmd } as never),
    ).rejects.toThrow('iterations must be a positive integer')
  })

  it('throws on zero iterations', async () => {
    const cmd = await importRunCommand()

    await expect(
      cmd.run!({ args: { iterations: '0' }, rawArgs: [], cmd } as never),
    ).rejects.toThrow('iterations must be a positive integer')
  })

  it('throws on negative iterations', async () => {
    const cmd = await importRunCommand()

    await expect(
      cmd.run!({ args: { iterations: '-1' }, rawArgs: [], cmd } as never),
    ).rejects.toThrow('iterations must be a positive integer')
  })

  it('passes model override to runLoop', async () => {
    const cmd = await importRunCommand()
    await cmd.run!({
      args: { iterations: '1', model: 'opus' },
      rawArgs: [],
      cmd,
    } as never)

    expect(mockRunLoop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ model: 'opus' }),
    )
  })

  it('passes verbose flag to runLoop', async () => {
    const cmd = await importRunCommand()
    await cmd.run!({
      args: { iterations: '1', verbose: true },
      rawArgs: [],
      cmd,
    } as never)

    expect(mockRunLoop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ verbose: true }),
    )
  })
})
