import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { runLoop } from '../loop/runner.js'

export default defineCommand({
  meta: {
    name: 'run',
    description: 'Execute the ralph iteration loop',
  },
  args: {
    iterations: {
      type: 'positional',
      description: 'Number of iterations to run (required)',
      required: true,
    },
    model: {
      type: 'string',
      description: 'Override default model',
    },
    verbose: {
      type: 'boolean',
      description: 'Enable verbose stream-json progress output',
    },
  },
  async run({ args }) {
    const config = await loadRalphConfig()
    const iterations = Number.parseInt(args.iterations as string, 10)

    if (Number.isNaN(iterations) || iterations < 1) {
      throw new Error('iterations must be a positive integer')
    }

    await runLoop(config, {
      iterations,
      model: args.model,
      verbose: args.verbose,
    })
  },
})
