import { consola } from 'consola'

interface StreamMessage {
  type: string
  message?: {
    content?: Array<{
      type: string
      name?: string
      text?: string
      input?: Record<string, unknown>
    }>
  }
  result?: string
  total_cost_usd?: number
}

interface ProgressResult {
  output: string
  turns: number
  cost: number | null
}

/**
 * Parse Claude stream-json output into human-readable progress.
 * Returns the final result text and metadata.
 */
export function parseStreamOutput(rawOutput: string, iteration: number): ProgressResult {
  let turns = 0
  let cost: number | null = null
  let resultText = ''

  const lines = rawOutput.split('\n').filter((line) => line.trim())

  for (const line of lines) {
    let message: StreamMessage
    try {
      message = JSON.parse(line) as StreamMessage
    } catch {
      continue
    }

    switch (message.type) {
      case 'system':
      case 'user':
        // Skip system init and user tool results
        break

      case 'assistant': {
        turns++
        consola.info(`--- Iteration ${iteration} | Turn ${turns} ---`)

        if (message.message?.content) {
          const toolDetails = message.message.content
            .filter((c) => c.type === 'tool_use')
            .map((c) => {
              const name = c.name || ''
              const input = (c.input || {}) as Record<string, string>

              if (['Read', 'Write', 'Edit'].includes(name)) {
                const filePath = input.file_path || ''
                return `${name} ${filePath.split('/').pop()}`
              }
              if (name === 'Glob') return `${name} ${input.pattern || ''}`
              if (name === 'Grep') return `${name} ${input.pattern || ''}`
              if (name === 'Bash') return `${name} ${(input.command || '').slice(0, 80)}`
              return name
            })

          if (toolDetails.length > 0) {
            consola.info(`  ${toolDetails.join('\n  ')}`)
          }

          const text = message.message.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text || '')
            .join('')

          if (text) {
            consola.info(text)
          }
        }
        break
      }

      case 'result': {
        resultText = message.result || ''
        cost = message.total_cost_usd ?? null
        consola.info('---')
        consola.info(`Completed in ${turns} turns | Cost: $${cost ?? '?'}`)
        break
      }

      default: {
        if (message.type) {
          consola.debug(`[debug] unrecognized type: ${message.type}`)
        }
        break
      }
    }
  }

  return { output: resultText, turns, cost }
}
