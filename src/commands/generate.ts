import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { generateAll } from '../generators/index.js'

export default defineCommand({
  meta: {
    name: 'generate',
    description: 'Regenerate all files from config (idempotent)',
  },
  args: {
    'dry-run': {
      type: 'boolean',
      description: 'Preview what would be generated',
      default: false,
    },
    only: {
      type: 'string',
      description: 'Only generate specific type: container|prompt|skills',
    },
  },
  async run({ args }) {
    const config = await loadRalphConfig()
    const only = args.only as 'container' | 'prompt' | 'skills' | undefined
    await generateAll(config, process.cwd(), {
      dryRun: args['dry-run'],
      only,
    })
  },
})
