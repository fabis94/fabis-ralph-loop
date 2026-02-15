import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { startContainer } from '../container/lifecycle.js'

export default defineCommand({
  meta: {
    name: 'start',
    description: 'Build & start container',
  },
  args: {
    attach: {
      type: 'boolean',
      description: 'Attach a bash shell after starting',
      default: false,
    },
  },
  async run({ args }) {
    const config = await loadRalphConfig()
    await startContainer(config, { attach: args.attach })
  },
})
