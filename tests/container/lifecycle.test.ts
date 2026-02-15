import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('execa', () => ({
  execa: vi.fn(),
}))
vi.mock('../../src/utils/docker.js', () => ({
  isContainerRunning: vi.fn(),
}))
vi.mock('consola', () => ({
  consola: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warn: vi.fn() },
}))

import { execa } from 'execa'
import { isContainerRunning } from '../../src/utils/docker.js'
import { startContainer, stopContainer } from '../../src/container/lifecycle.js'
import { makeConfig } from '../helpers/make-config.js'

const mockExeca = vi.mocked(execa)
const mockIsRunning = vi.mocked(isContainerRunning)

describe('startContainer', () => {
  let origToken: string | undefined
  const origExit = process.exit

  beforeEach(() => {
    vi.resetAllMocks()
    origToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
    mockExeca.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as never)
    mockIsRunning.mockResolvedValue(true)
  })

  afterEach(() => {
    if (origToken !== undefined) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = origToken
    } else {
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    }
    process.exit = origExit
  })

  it('exits when CLAUDE_CODE_OAUTH_TOKEN is not set', async () => {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    process.exit = vi.fn(() => {
      throw new Error('process.exit')
    }) as never

    const config = makeConfig()
    await expect(startContainer(config)).rejects.toThrow('process.exit')
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('runs pre-start command when configured', async () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-token'

    const config = makeConfig({ setup: { preStartCommand: 'echo hello' } })
    await startContainer(config)

    expect(mockExeca).toHaveBeenCalledWith('sh', ['-c', 'echo hello'], { stdio: 'inherit' })
  })

  it('starts container when not running', async () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-token'
    mockIsRunning.mockResolvedValue(false)

    const config = makeConfig()
    await startContainer(config)

    expect(mockExeca).toHaveBeenCalledWith(
      'docker',
      ['compose', '-f', '.ralph-container/docker-compose.yml', 'up', '-d', '--build'],
      { stdio: 'inherit' },
    )
  })

  it('skips docker compose up when already running', async () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-token'
    mockIsRunning.mockResolvedValue(true)

    const config = makeConfig()
    await startContainer(config)

    const composeUpCall = mockExeca.mock.calls.find(
      (call) => call[0] === 'docker' && (call[1] as string[]).includes('up'),
    )
    expect(composeUpCall).toBeUndefined()
  })
})

describe('stopContainer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockExeca.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as never)
  })

  it('runs docker compose down', async () => {
    await stopContainer()

    expect(mockExeca).toHaveBeenCalledWith(
      'docker',
      ['compose', '-f', '.ralph-container/docker-compose.yml', 'down'],
      { stdio: 'inherit' },
    )
  })
})
