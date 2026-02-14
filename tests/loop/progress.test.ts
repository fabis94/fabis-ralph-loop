import { describe, it, expect } from 'vitest'
import { parseStreamOutput } from '../../src/loop/progress.js'

describe('parseStreamOutput', () => {
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
