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
 * Streaming progress parser for Claude stream-json output.
 * Processes lines incrementally as they arrive, logging progress to stderr.
 */
export class StreamProgressParser {
  private turns = 0
  private cost: number | null = null
  private resultText = ''
  private buffer = ''

  constructor(private iteration: number) {}

  /**
   * Feed a raw chunk of data. Internally buffers and processes complete lines.
   */
  processChunk(chunk: Buffer | string): void {
    this.buffer += chunk.toString()
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? '' // keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) this.processLine(line)
    }
  }

  /**
   * Flush any remaining buffered data. Call after the process exits.
   */
  flush(): void {
    if (this.buffer.trim()) {
      this.processLine(this.buffer)
      this.buffer = ''
    }
  }

  getResult(): ProgressResult {
    return { output: this.resultText, turns: this.turns, cost: this.cost }
  }

  private processLine(line: string): void {
    let message: StreamMessage
    try {
      message = JSON.parse(line) as StreamMessage
    } catch {
      return
    }

    switch (message.type) {
      case 'system':
      case 'user':
        break

      case 'assistant': {
        this.turns++
        consola.info(`--- Iteration ${this.iteration} | Turn ${this.turns} ---`)

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
        this.resultText = message.result || ''
        this.cost = message.total_cost_usd ?? null
        if (this.resultText) {
          consola.box(this.resultText)
        }
        consola.info(`Completed in ${this.turns} turns | Cost: $${this.cost ?? '?'}`)
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
}

/**
 * Parse Claude stream-json output into human-readable progress.
 * Returns the final result text and metadata.
 */
export function parseStreamOutput(rawOutput: string, iteration: number): ProgressResult {
  const parser = new StreamProgressParser(iteration)
  parser.processChunk(rawOutput)
  parser.flush()
  return parser.getResult()
}
