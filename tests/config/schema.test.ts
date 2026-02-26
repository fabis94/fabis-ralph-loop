import { describe, it, expect } from 'vitest'
import { ralphLoopConfigSchema } from '../../src/config/schema.js'

describe('ralphLoopConfigSchema', () => {
  it('validates a minimal valid config', () => {
    const result = ralphLoopConfigSchema.safeParse({
      project: { name: 'Test Project' },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.project.name).toBe('Test Project')
      expect(result.data.container.name).toBe('ralph-container')
      expect(result.data.container.baseImage).toBe('node:22-bookworm')
      expect(result.data.defaults.agent).toBe('claude')
      expect(result.data.defaults.model).toBe('sonnet')
      expect(result.data.output.mode).toBe('direct')
    }
  })

  it('validates a full config', () => {
    const result = ralphLoopConfigSchema.safeParse({
      container: {
        name: 'my-ralph',
        baseImage: 'python:3.12-bookworm',
        systemPackages: ['postgresql-client'],
        playwright: true,
        networkMode: 'bridge',
        env: { FOO: 'bar' },
        shmSize: '4gb',
        capabilities: ['SYS_ADMIN'],
        volumes: ['./data:/data:ro'],
        shadowVolumes: ['/workspace/node_modules'],
        persistVolumes: { 'my-vol': '/home/node/.claude' },
        hooks: {
          rootSetup: ['RUN npm install -g pnpm@10'],
          userSetup: ['RUN corepack enable'],
        },
      },
      setup: { preStartCommand: 'docker compose up -d' },
      defaults: {
        agent: 'claude',
        model: 'opus',
        verbose: true,
        sleepBetweenMs: 5000,
        completionSignal: 'DONE',
      },
      project: {
        name: 'Full Project',
        description: 'A test project',
        context: 'Monorepo managed with pnpm',
        backpressureCommands: [{ name: 'Build', command: 'pnpm build' }],
        openAppSkill: '.claude/skills/open-app/SKILL.md',
      },
      output: {
        mode: 'uac',
        uacTemplatesDir: '.uac',
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.container.name).toBe('my-ralph')
      expect(result.data.container.systemPackages).toEqual(['postgresql-client'])
      expect(result.data.container.playwright).toBe('cli')
      expect(result.data.defaults.model).toBe('opus')
      expect(result.data.output.mode).toBe('uac')
    }
  })

  it('normalizes playwright: true to "cli"', () => {
    const result = ralphLoopConfigSchema.parse({
      project: { name: 'Test' },
      container: { name: 'test', playwright: true },
    })
    expect(result.container.playwright).toBe('cli')
  })

  it('accepts playwright: "cli"', () => {
    const result = ralphLoopConfigSchema.parse({
      project: { name: 'Test' },
      container: { name: 'test', playwright: 'cli' },
    })
    expect(result.container.playwright).toBe('cli')
  })

  it('accepts playwright: "mcp"', () => {
    const result = ralphLoopConfigSchema.parse({
      project: { name: 'Test' },
      container: { name: 'test', playwright: 'mcp' },
    })
    expect(result.container.playwright).toBe('mcp')
  })

  it('keeps playwright: false as false', () => {
    const result = ralphLoopConfigSchema.parse({
      project: { name: 'Test' },
      container: { name: 'test', playwright: false },
    })
    expect(result.container.playwright).toBe(false)
  })

  it('rejects invalid playwright string', () => {
    const result = ralphLoopConfigSchema.safeParse({
      project: { name: 'Test' },
      container: { name: 'test', playwright: 'invalid' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing project.name', () => {
    const result = ralphLoopConfigSchema.safeParse({
      project: {},
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid agent', () => {
    const result = ralphLoopConfigSchema.safeParse({
      project: { name: 'Test' },
      defaults: { agent: 'copilot' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid output mode', () => {
    const result = ralphLoopConfigSchema.safeParse({
      project: { name: 'Test' },
      output: { mode: 'invalid' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative sleepBetweenMs', () => {
    const result = ralphLoopConfigSchema.safeParse({
      project: { name: 'Test' },
      defaults: { sleepBetweenMs: -1 },
    })
    expect(result.success).toBe(false)
  })

  it('applies defaults for missing optional fields', () => {
    const result = ralphLoopConfigSchema.parse({
      project: { name: 'Test' },
    })
    expect(result.container.playwright).toBe(false)
    expect(result.container.networkMode).toBe('host')
    expect(result.container.shmSize).toBe('64m')
    expect(result.container.capabilities).toEqual([])
    expect(result.container.shadowVolumes).toEqual([])
    expect(result.container.hooks.rootSetup).toEqual([])
    expect(result.container.hooks.userSetup).toEqual([])
    expect(result.setup.preStartCommand).toBe('')
    expect(result.defaults.verbose).toBe(false)
    expect(result.defaults.sleepBetweenMs).toBe(2000)
    expect(result.defaults.completionSignal).toBe('RALPH_WORK_FULLY_DONE')
    expect(result.project.description).toBe('')
    expect(result.project.backpressureCommands).toEqual([])
    expect(result.project.openAppSkill).toBe('')
    expect(result.output.uacTemplatesDir).toBe('.universal-ai-config')
  })
})
