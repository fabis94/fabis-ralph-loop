import { defineCommand } from 'citty'
import { stopContainer } from '../container/lifecycle.js'

export default defineCommand({
  meta: {
    name: 'stop',
    description: 'Stop & remove container',
  },
  async run() {
    await stopContainer()
  },
})
