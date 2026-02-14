import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { startContainer } from '../container/lifecycle.js'

export default defineCommand({
  meta: {
    name: 'start',
    description: 'Build & start container, attach bash',
  },
  args: {
    'no-attach': {
      type: 'boolean',
      description: 'Start without attaching',
      default: false,
    },
  },
  async run({ args }) {
    const config = await loadRalphConfig()
    await startContainer(config, { noAttach: args['no-attach'] })
  },
})
