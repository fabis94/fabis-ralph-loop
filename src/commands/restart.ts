import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { stopContainer, startContainer } from '../container/lifecycle.js'

export default defineCommand({
  meta: {
    name: 'restart',
    description: 'Stop + start container',
  },
  args: {
    'no-attach': {
      type: 'boolean',
      description: 'Start without attaching',
      default: false,
    },
  },
  async run({ args }) {
    await stopContainer()
    const config = await loadRalphConfig()
    await startContainer(config, { noAttach: args['no-attach'] })
  },
})
