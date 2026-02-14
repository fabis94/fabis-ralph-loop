import { defineCommand } from 'citty'
import { loadRalphConfig } from '../config/loader.js'
import { execInContainer } from '../container/lifecycle.js'

export default defineCommand({
  meta: {
    name: 'exec',
    description: 'Run arbitrary command inside container',
  },
  args: {
    command: {
      type: 'positional',
      description: 'Command to execute',
      required: true,
    },
  },
  async run({ args }) {
    const config = await loadRalphConfig()
    // args._ contains the rest of the arguments after the command
    const command = [
      args.command as string,
      ...(((args as Record<string, unknown>)._ as string[]) || []),
    ]
    await execInContainer(config.container.name, command)
  },
})
