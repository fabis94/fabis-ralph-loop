import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { showLogs } from '../container/lifecycle.js'

export default defineCommand({
  meta: {
    name: 'logs',
    description: 'Follow container logs',
  },
  async run() {
    const config = await loadRalphConfig()
    await showLogs(config.container.name)
  },
})
