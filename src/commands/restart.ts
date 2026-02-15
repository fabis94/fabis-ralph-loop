import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { stopContainer, startContainer } from '../container/lifecycle.js'

export default defineCommand({
  meta: {
    name: 'restart',
    description: 'Stop + start container',
  },
  args: {
    attach: {
      type: 'boolean',
      description: 'Attach a bash shell after starting',
      default: false,
    },
  },
  async run({ args }) {
    await stopContainer()
    const config = await loadRalphConfig()
    await startContainer(config, { attach: args.attach })
  },
})
