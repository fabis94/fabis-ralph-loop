import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { consola } from 'consola'
import { execAgent } from '../container/exec.js'
import { StreamProgressParser } from './progress.js'
import { archiveIfBranchChanged, ensureProgressFile } from './archive.js'
import type { ResolvedConfig } from '../config/schema.js'

interface RunOptions {
  iterations: number
  model?: string
  verbose?: boolean
}

interface IterationStats {
  iteration: number
  turns: number
  cost: number | null
}

function buildAgentArgs(agent: string, options: { model: string; verbose: boolean }): string[] {
  if (agent === 'claude') {
    const args = ['--dangerously-skip-permissions', '--model', options.model, '--print']
    if (options.verbose) {
      args.push('--verbose', '--output-format', 'stream-json')
    }
    return args
  }
  // Future: support other agents
  return []
}

function formatCost(cost: number | null): string {
  return cost != null ? `$${cost.toFixed(4)}` : '$?'
}

function logSummaryTable(stats: IterationStats[]): void {
  const totalTurns = stats.reduce((sum, s) => sum + s.turns, 0)
  const costs = stats.map((s) => s.cost)
  const totalCost = costs.every((c): c is number => c != null)
    ? costs.reduce((sum, c) => sum + c, 0)
    : null

  const rows = stats.map((s) => [String(s.iteration), String(s.turns), formatCost(s.cost)])
  const totalRow = ['Total', String(totalTurns), formatCost(totalCost)]

  const headers = ['Iteration', 'Turns', 'Cost']
  const allRows = [...rows, totalRow]
  const widths = headers.map((h, col) => {
    const cellLengths = allRows.map((r) => (r[col] ?? '').length)
    return Math.max(h.length, ...cellLengths)
  })

  const formatRow = (row: string[]) => row.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  ')
  const separator = widths.map((w) => '-'.repeat(w)).join('  ')

  const lines = [
    '',
    formatRow(headers),
    separator,
    ...rows.map(formatRow),
    separator,
    formatRow(totalRow),
  ]

  consola.info(lines.join('\n'))
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

export async function runLoop(config: ResolvedConfig, options: RunOptions): Promise<void> {
  const model = options.model || config.defaults.model
  const verbose = options.verbose ?? config.defaults.verbose
  const { sleepBetweenMs, completionSignal } = config.defaults

  if (!existsSync('/.dockerenv')) {
    consola.warn(
      'It looks like you are running outside a Docker container. The loop is designed to run inside the Ralph container (use `ralph-loop start` to launch it).',
    )
  }

  await ensureProgressFile()

  const abortController = new AbortController()
  const { signal } = abortController

  // First Ctrl+C: graceful cleanup (abort agent + container process).
  // Second Ctrl+C: force exit (process.once removes the handler after first call,
  // so the default Node.js SIGINT behavior kicks in).
  const handleSignal = () => {
    consola.warn('\nInterrupted. Cleaning up...')
    abortController.abort()
  }
  process.once('SIGINT', handleSignal)
  process.once('SIGTERM', handleSignal)

  consola.info(
    [
      `Starting Ralph`,
      `Agent: ${config.defaults.agent}`,
      `Model: ${model}`,
      `Verbose: ${verbose}`,
      `Iterations: ${options.iterations}`,
    ].join(' | '),
  )

  const iterationStats: IterationStats[] = []

  try {
    for (let i = 1; i <= options.iterations; i++) {
      if (signal.aborted) break

      consola.box(`Ralph Iteration ${i} of ${options.iterations} (${config.defaults.agent})`)

      await archiveIfBranchChanged()

      const promptContent = await readFile('.ralph-container/ralph-prompt.md', 'utf8')
      const agentArgs = buildAgentArgs(config.defaults.agent, { model, verbose })

      let finalOutput: string
      let turnsUsed = '?'

      try {
        if (verbose) {
          // Verbose: parse stream-json lines in real-time, show progress on stderr
          const parser = new StreamProgressParser(i)
          const result = await execAgent({
            command: config.defaults.agent,
            args: agentArgs,
            input: promptContent,
            onData: (chunk) => parser.processChunk(chunk),
            onStderr: (chunk) => process.stderr.write(chunk),
            signal,
          })

          if (result.aborted) break

          parser.flush()
          const progress = parser.getResult()
          finalOutput = progress.output
          turnsUsed = String(progress.turns)
          iterationStats.push({ iteration: i, turns: progress.turns, cost: progress.cost })

          if (result.exitCode !== 0) {
            consola.warn(`Agent exited with code ${result.exitCode}`)
          }
        } else {
          // Non-verbose: stream both stdout and stderr to stderr in real-time
          const result = await execAgent({
            command: config.defaults.agent,
            args: agentArgs,
            input: promptContent,
            onData: (chunk) => process.stderr.write(chunk),
            onStderr: (chunk) => process.stderr.write(chunk),
            signal,
          })

          if (result.aborted) break

          finalOutput = result.stdout
        }
      } catch (error) {
        consola.error(`Agent execution failed: ${error instanceof Error ? error.message : error}`)
        finalOutput = ''
      }

      if (finalOutput.includes(completionSignal)) {
        consola.success(
          `All stories complete! Completed at iteration ${i} of ${options.iterations}`,
        )
        return
      }

      if (i < options.iterations) {
        consola.info(
          `Iteration ${i} complete (${turnsUsed} turns). Sleeping ${sleepBetweenMs}ms...`,
        )
        await sleep(sleepBetweenMs, signal)
      }
    }

    if (signal.aborted) {
      consola.info('Stopped.')
      process.exitCode = 130
      return
    }

    consola.warn(`Reached max iterations (${options.iterations}) without completing all tasks.`)
    consola.warn('Check .ralph/progress.txt for status.')
    process.exitCode = 1
  } finally {
    if (verbose && iterationStats.length > 0) {
      logSummaryTable(iterationStats)
    }
    process.removeListener('SIGINT', handleSignal)
    process.removeListener('SIGTERM', handleSignal)
  }
}
