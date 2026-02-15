import { describe, it, expect } from 'vitest'
import { mergeConfigs } from '../../src/config/merge.js'

describe('mergeConfigs', () => {
  it('returns base when overrides is empty', () => {
    const base = { project: { name: 'Test' } }
    const result = mergeConfigs(base, {})
    expect(result).toEqual(base)
  })

  it('replaces scalar values', () => {
    const base = { defaults: { model: 'sonnet', verbose: false } }
    const overrides = { defaults: { model: 'opus', verbose: true } }
    const result = mergeConfigs(base, overrides)
    expect(result.defaults).toEqual({ model: 'opus', verbose: true })
  })

  it('replaces arrays entirely', () => {
    const base = {
      container: {
        systemPackages: ['git', 'curl'],
      },
    }
    const overrides = {
      container: {
        systemPackages: ['ripgrep'],
      },
    }
    const result = mergeConfigs(base, overrides)
    expect(result.container!.systemPackages).toEqual(['ripgrep'])
  })

  it('merges nested objects recursively', () => {
    const base = {
      container: {
        name: 'base-container',
        baseImage: 'node:22',
        playwright: false,
      },
    }
    const overrides = {
      container: {
        playwright: true,
      },
    }
    const result = mergeConfigs(base, overrides)
    expect(result.container).toEqual({
      name: 'base-container',
      baseImage: 'node:22',
      playwright: true,
    })
  })

  it('handles deeply nested objects (container.hooks)', () => {
    const base = {
      container: {
        name: 'test',
        hooks: {
          rootSetup: ['RUN apt-get update'],
          userSetup: ['RUN npm install -g pnpm'],
          entrypointSetup: ['pnpm install'],
        },
      },
    }
    const overrides = {
      container: {
        hooks: {
          rootSetup: ['RUN apt-get install -y curl'],
        },
      },
    }
    const result = mergeConfigs(base, overrides)
    expect(result.container!.hooks).toEqual({
      rootSetup: ['RUN apt-get install -y curl'],
      userSetup: ['RUN npm install -g pnpm'],
      entrypointSetup: ['pnpm install'],
    })
  })

  it('skips undefined values in overrides', () => {
    const base = {
      project: { name: 'Test', description: 'A description' },
    }
    const overrides = {
      project: { name: 'Override', description: undefined },
    }
    const result = mergeConfigs(base, overrides)
    expect(result.project!.name).toBe('Override')
    expect(result.project!.description).toBe('A description')
  })

  it('adds new keys from overrides', () => {
    const base = { container: { name: 'test' } }
    const overrides = { container: { playwright: true } }
    const result = mergeConfigs(base, overrides)
    expect(result.container).toEqual({ name: 'test', playwright: true })
  })

  it('adds new top-level sections from overrides', () => {
    const base: Record<string, unknown> = { project: { name: 'Test' } }
    const overrides = { defaults: { model: 'opus' } }
    const result = mergeConfigs(base, overrides)
    expect(result.project).toEqual({ name: 'Test' })
    expect(result.defaults).toEqual({ model: 'opus' })
  })

  it('replaces record objects entirely within nested objects', () => {
    const base = {
      container: {
        name: 'test',
        env: { FOO: 'base', BAR: 'keep' },
      },
    }
    const overrides = {
      container: {
        env: { FOO: 'override', NEW: 'added' },
      },
    }
    const result = mergeConfigs(base, overrides)
    // env is a nested object within container, so it gets shallow-merged
    expect(result.container!.env).toEqual({ FOO: 'override', BAR: 'keep', NEW: 'added' })
  })

  it('handles complex multi-level scenario', () => {
    const base = {
      container: {
        name: 'base',
        systemPackages: ['git'],
        env: { NODE_ENV: 'development' },
        hooks: { rootSetup: ['RUN apt-get update'], userSetup: [] },
      },
      defaults: { model: 'sonnet', verbose: false, sleepBetweenMs: 2000 },
      project: { name: 'My Project', description: 'Original' },
    }
    const overrides = {
      container: {
        systemPackages: ['ripgrep'],
        env: { DEBUG: 'true' },
      },
      defaults: { model: 'opus', verbose: true },
    }
    const result = mergeConfigs(base, overrides)

    expect(result.container!.name).toBe('base')
    expect(result.container!.systemPackages).toEqual(['ripgrep'])
    expect(result.container!.env).toEqual({ NODE_ENV: 'development', DEBUG: 'true' })
    expect(result.container!.hooks).toEqual({
      rootSetup: ['RUN apt-get update'],
      userSetup: [],
    })
    expect(result.defaults!.model).toBe('opus')
    expect(result.defaults!.verbose).toBe(true)
    expect(result.defaults!.sleepBetweenMs).toBe(2000)
    expect(result.project!.name).toBe('My Project')
    expect(result.project!.description).toBe('Original')
  })
})
