import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../src/container/exec.js', () => ({
  execAgent: vi.fn(),
}))
vi.mock('../../src/loop/archive.js', () => ({
  archiveIfBranchChanged: vi.fn(),
  ensureProgressFile: vi.fn(),
}))
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))
vi.mock('consola', () => ({
  consola: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn(), box: vi.fn() },
}))

import { execAgent } from '../../src/container/exec.js'
import { archiveIfBranchChanged, ensureProgressFile } from '../../src/loop/archive.js'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { consola } from 'consola'
import { runLoop } from '../../src/loop/runner.js'
import { makeConfig as _makeConfig } from '../helpers/make-config.js'

const mockExecAgent = vi.mocked(execAgent)
const mockArchive = vi.mocked(archiveIfBranchChanged)
const mockEnsureProgress = vi.mocked(ensureProgressFile)
const mockReadFile = vi.mocked(readFile)
const mockExistsSync = vi.mocked(existsSync)

function makeConfig(overrides: Record<string, unknown> = {}) {
  return _makeConfig({ defaults: { sleepBetweenMs: 0 }, ...overrides })
}

describe('runLoop', () => {
  let origExitCode: typeof process.exitCode

  beforeEach(() => {
    vi.resetAllMocks()
    origExitCode = process.exitCode
    process.exitCode = undefined
    mockExistsSync.mockReturnValue(true)
    mockReadFile.mockResolvedValue('prompt content' as never)
    mockArchive.mockResolvedValue()
    mockEnsureProgress.mockResolvedValue()
  })

  afterEach(() => {
    process.exitCode = origExitCode
  })

  it('stops when completion signal is found in output', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: 'Working...\nRALPH_WORK_FULLY_DONE',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 5 })

    expect(mockExecAgent).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBeUndefined()
  })

  it('sets exitCode to 1 when max iterations reached without completion', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: 'Still working...',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 2 })

    expect(mockExecAgent).toHaveBeenCalledTimes(2)
    expect(process.exitCode).toBe(1)
  })

  it('breaks loop when agent reports abort', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      aborted: true,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 5 })

    // Loop should break after first aborted result
    expect(mockExecAgent).toHaveBeenCalledTimes(1)
  })

  it('handles agent execution failure gracefully', async () => {
    mockExecAgent.mockRejectedValue(new Error('Agent crashed'))

    const config = makeConfig()
    await runLoop(config, { iterations: 1 })

    expect(process.exitCode).toBe(1)
  })

  it('calls ensureProgressFile before starting loop', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: 'RALPH_WORK_FULLY_DONE',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 1 })

    expect(mockEnsureProgress).toHaveBeenCalledOnce()
  })

  it('calls archiveIfBranchChanged each iteration', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: 'working',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 3 })

    expect(mockArchive).toHaveBeenCalledTimes(3)
  })

  it('passes correct agent args for claude in non-verbose mode', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: 'RALPH_WORK_FULLY_DONE',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 1 })

    expect(mockExecAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'claude',
        args: ['--dangerously-skip-permissions', '--model', 'sonnet', '--print'],
        input: 'prompt content',
      }),
    )
  })

  it('passes verbose agent args when verbose is true', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 1, verbose: true })

    expect(mockExecAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [
          '--dangerously-skip-permissions',
          '--model',
          'sonnet',
          '--print',
          '--verbose',
          '--output-format',
          'stream-json',
        ],
      }),
    )
  })

  it('reads prompt from .ralph-container/ralph-prompt.md', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: 'RALPH_WORK_FULLY_DONE',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 1 })

    expect(mockReadFile).toHaveBeenCalledWith('.ralph-container/ralph-prompt.md', 'utf8')
  })

  it('logs summary table in verbose mode', async () => {
    const streamLines = (turns: number, cost: number) => {
      const lines: string[] = []
      for (let t = 0; t < turns; t++) {
        lines.push(
          JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'working' }] },
          }),
        )
      }
      lines.push(JSON.stringify({ type: 'result', result: 'done', total_cost_usd: cost }))
      return lines.join('\n') + '\n'
    }

    let callCount = 0
    mockExecAgent.mockImplementation(async (opts: { onData?: (chunk: Buffer) => void }) => {
      callCount++
      const data = callCount === 1 ? streamLines(5, 0.03) : streamLines(8, 0.05)
      opts.onData?.(Buffer.from(data))
      return { stdout: '', stderr: '', exitCode: 0, aborted: false }
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 2, verbose: true })

    const mockInfo = vi.mocked(consola.info)
    const tableCall = mockInfo.mock.calls.find(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('Iteration') &&
        args[0].includes('Turns') &&
        args[0].includes('Cost'),
    )

    expect(tableCall).toBeDefined()
    const table = tableCall![0] as string
    expect(table).toContain('1')
    expect(table).toContain('5')
    expect(table).toContain('$0.0300')
    expect(table).toContain('2')
    expect(table).toContain('8')
    expect(table).toContain('$0.0500')
    expect(table).toContain('Total')
    expect(table).toContain('13')
    expect(table).toContain('$0.0800')
  })

  it('does not log summary table in non-verbose mode', async () => {
    mockExecAgent.mockResolvedValue({
      stdout: 'working',
      stderr: '',
      exitCode: 0,
      aborted: false,
    })

    const config = makeConfig()
    await runLoop(config, { iterations: 2 })

    const mockInfo = vi.mocked(consola.info)
    const tableCall = mockInfo.mock.calls.find(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('Iteration') &&
        args[0].includes('Turns') &&
        args[0].includes('Cost'),
    )

    expect(tableCall).toBeUndefined()
  })
})
