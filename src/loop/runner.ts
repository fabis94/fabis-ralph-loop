import { readFile } from 'node:fs/promises'
import { consola } from 'consola'
import { execAgent } from '../container/exec.js'
import { parseStreamOutput } from './progress.js'
import { archiveIfBranchChanged, ensureProgressFile } from './archive.js'
import type { ResolvedConfig } from '../config/schema.js'

interface RunOptions {
  iterations: number
  model?: string
  verbose?: boolean
  noContainer?: boolean
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runLoop(config: ResolvedConfig, options: RunOptions): Promise<void> {
  const model = options.model || config.defaults.model
  const verbose = options.verbose ?? config.defaults.verbose
  const { sleepBetweenMs, completionSignal } = config.defaults

  await ensureProgressFile()

  for (let i = 1; i <= options.iterations; i++) {
    consola.box(`Ralph Iteration ${i} of ${options.iterations} (${config.defaults.agent})`)

    await archiveIfBranchChanged()

    const promptContent = await readFile('.ralph-container/ralph-prompt.md', 'utf8')
    const agentArgs = buildAgentArgs(config.defaults.agent, { model, verbose })

    const rawOutput = await execAgent({
      containerName: options.noContainer ? undefined : config.container.name,
      command: config.defaults.agent,
      args: agentArgs,
      input: promptContent,
    })

    let finalOutput: string
    if (verbose) {
      const result = parseStreamOutput(rawOutput, i)
      finalOutput = result.output
    } else {
      // In non-verbose mode, pipe to stderr for visibility
      process.stderr.write(rawOutput)
      finalOutput = rawOutput
    }

    if (finalOutput.includes(completionSignal)) {
      consola.success('All stories complete!')
      return
    }

    if (i < options.iterations) {
      consola.info(`Iteration ${i} complete. Sleeping ${sleepBetweenMs}ms...`)
      await sleep(sleepBetweenMs)
    }
  }

  consola.warn(`Reached max iterations (${options.iterations}) without completing all tasks.`)
}
