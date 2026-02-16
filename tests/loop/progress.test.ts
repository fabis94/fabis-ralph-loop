import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseStreamOutput, StreamProgressParser } from '../../src/loop/progress.js'
import { consola } from 'consola'

vi.mock('consola', () => ({
  consola: {
    info: vi.fn(),
    log: vi.fn(),
    box: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockConsola = vi.mocked(consola)

describe('parseStreamOutput', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('parses a result message', () => {
    const input = JSON.stringify({
      type: 'result',
      result: 'Story US-001 complete.\nRALPH_WORK_FULLY_DONE',
      total_cost_usd: 0.42,
    })

    const result = parseStreamOutput(input, 1)
    expect(result.output).toContain('RALPH_WORK_FULLY_DONE')
    expect(result.cost).toBe(0.42)
  })

  it('counts assistant turns', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Working...' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Still working...' }] },
      }),
      JSON.stringify({
        type: 'result',
        result: 'Done',
        total_cost_usd: 0.1,
      }),
    ].join('\n')

    const result = parseStreamOutput(lines, 1)
    expect(result.turns).toBe(2)
    expect(result.output).toBe('Done')
  })

  it('handles tool_use messages', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Read',
              input: { file_path: '/workspace/src/index.ts' },
            },
            {
              type: 'tool_use',
              name: 'Bash',
              input: { command: 'pnpm build' },
            },
          ],
        },
      }),
      JSON.stringify({ type: 'result', result: 'OK' }),
    ].join('\n')

    const result = parseStreamOutput(lines, 1)
    expect(result.turns).toBe(1)
  })

  it('skips system and user messages', () => {
    const lines = [
      JSON.stringify({ type: 'system', session_id: '123' }),
      JSON.stringify({ type: 'user', message: 'tool result' }),
      JSON.stringify({ type: 'result', result: 'Done' }),
    ].join('\n')

    const result = parseStreamOutput(lines, 1)
    expect(result.turns).toBe(0)
    expect(result.output).toBe('Done')
  })

  it('handles empty input', () => {
    const result = parseStreamOutput('', 1)
    expect(result.turns).toBe(0)
    expect(result.output).toBe('')
    expect(result.cost).toBeNull()
  })

  it('handles invalid JSON lines gracefully', () => {
    const lines = ['not json', JSON.stringify({ type: 'result', result: 'OK' })].join('\n')

    const result = parseStreamOutput(lines, 1)
    expect(result.output).toBe('OK')
  })
})

describe('StreamProgressParser logging', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('logs result text via consola.box', () => {
    const parser = new StreamProgressParser(1)
    const input = JSON.stringify({
      type: 'result',
      result: 'All stories complete.\nRALPH_WORK_FULLY_DONE',
      total_cost_usd: 1.5,
    })

    parser.processChunk(input + '\n')

    expect(mockConsola.box).toHaveBeenCalledWith('All stories complete.\nRALPH_WORK_FULLY_DONE')
    expect(mockConsola.info).toHaveBeenCalledWith('Completed in 0 turns | Cost: $1.5')
  })

  it('does not call consola.box when result text is empty', () => {
    const parser = new StreamProgressParser(1)
    const input = JSON.stringify({
      type: 'result',
      result: '',
      total_cost_usd: 0.5,
    })

    parser.processChunk(input + '\n')

    expect(mockConsola.box).not.toHaveBeenCalled()
    expect(mockConsola.info).toHaveBeenCalledWith('Completed in 0 turns | Cost: $0.5')
  })

  it('logs turn markers and assistant text via consola.info', () => {
    const parser = new StreamProgressParser(2)
    const input = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Implementing feature...' }] },
    })

    parser.processChunk(input + '\n')

    expect(mockConsola.info).toHaveBeenCalledWith('--- Iteration 2 | Turn 1 ---')
    expect(mockConsola.info).toHaveBeenCalledWith('Implementing feature...')
  })

  it('logs tool summaries via consola.info', () => {
    const parser = new StreamProgressParser(1)
    const input = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', name: 'Bash', input: { command: 'pnpm test' } }],
      },
    })

    parser.processChunk(input + '\n')

    expect(mockConsola.info).toHaveBeenCalledWith('  Bash pnpm test')
  })
})
