import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'

vi.mock('execa', () => ({
  execa: vi.fn(),
}))

import { execa } from 'execa'
import { execAgent } from '../../src/container/exec.js'

const mockExeca = vi.mocked(execa)

describe('execAgent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns stdout, stderr, and exitCode', async () => {
    const proc = Object.assign(Promise.resolve({ stdout: 'out', stderr: 'err', exitCode: 0 }), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    })
    mockExeca.mockReturnValue(proc as never)

    const result = await execAgent({ command: 'echo', args: ['hello'] })

    expect(result).toEqual({ stdout: 'out', stderr: 'err', exitCode: 0, aborted: false })
    expect(mockExeca).toHaveBeenCalledWith('echo', ['hello'], {
      input: undefined,
      reject: false,
    })
  })

  it('passes input to execa', async () => {
    const proc = Object.assign(Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    })
    mockExeca.mockReturnValue(proc as never)

    await execAgent({ command: 'cat', args: [], input: 'hello' })

    expect(mockExeca).toHaveBeenCalledWith('cat', [], { input: 'hello', reject: false })
  })

  it('calls onData callback with stdout chunks', async () => {
    const chunks: Buffer[] = []
    const stdoutEmitter = new EventEmitter()
    let resolveProc!: (v: unknown) => void
    const proc = Object.assign(new Promise((r) => (resolveProc = r)), {
      stdout: stdoutEmitter,
      stderr: new EventEmitter(),
      kill: vi.fn(),
    })
    mockExeca.mockReturnValue(proc as never)

    const resultPromise = execAgent({
      command: 'test',
      args: [],
      onData: (chunk) => chunks.push(chunk),
    })

    stdoutEmitter.emit('data', Buffer.from('hello'))
    stdoutEmitter.emit('data', Buffer.from('world'))
    resolveProc({ stdout: 'helloworld', stderr: '', exitCode: 0 })

    await resultPromise
    expect(chunks).toEqual([Buffer.from('hello'), Buffer.from('world')])
  })

  it('calls onStderr callback with stderr chunks', async () => {
    const chunks: Buffer[] = []
    const stderrEmitter = new EventEmitter()
    let resolveProc!: (v: unknown) => void
    const proc = Object.assign(new Promise((r) => (resolveProc = r)), {
      stdout: new EventEmitter(),
      stderr: stderrEmitter,
      kill: vi.fn(),
    })
    mockExeca.mockReturnValue(proc as never)

    const resultPromise = execAgent({
      command: 'test',
      args: [],
      onStderr: (chunk) => chunks.push(chunk),
    })

    stderrEmitter.emit('data', Buffer.from('warning'))
    resolveProc({ stdout: '', stderr: 'warning', exitCode: 0 })

    await resultPromise
    expect(chunks).toEqual([Buffer.from('warning')])
  })

  it('kills process when signal is already aborted', async () => {
    const kill = vi.fn()
    const proc = Object.assign(Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill,
    })
    mockExeca.mockReturnValue(proc as never)

    const controller = new AbortController()
    controller.abort()

    const result = await execAgent({ command: 'test', args: [], signal: controller.signal })

    expect(kill).toHaveBeenCalledWith('SIGTERM')
    expect(result.aborted).toBe(true)
  })

  it('kills process when signal is aborted during execution', async () => {
    const kill = vi.fn()
    let resolveProc!: (v: unknown) => void
    const proc = Object.assign(new Promise((r) => (resolveProc = r)), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill,
    })
    mockExeca.mockReturnValue(proc as never)

    const controller = new AbortController()
    const resultPromise = execAgent({ command: 'test', args: [], signal: controller.signal })

    controller.abort()
    resolveProc({ stdout: '', stderr: '', exitCode: 0 })

    const result = await resultPromise
    expect(kill).toHaveBeenCalledWith('SIGTERM')
    expect(result.aborted).toBe(true)
  })

  it('defaults exitCode to 1 when undefined', async () => {
    const proc = Object.assign(Promise.resolve({ stdout: '', stderr: '', exitCode: undefined }), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    })
    mockExeca.mockReturnValue(proc as never)

    const result = await execAgent({ command: 'test', args: [] })
    expect(result.exitCode).toBe(1)
  })
})
