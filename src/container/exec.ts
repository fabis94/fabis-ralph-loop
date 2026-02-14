import { execa } from 'execa'

interface AgentExecOptions {
  containerName?: string
  command: string
  args: string[]
  input?: string
}

/**
 * Execute a command, optionally inside a Docker container.
 * Returns stdout as a string.
 */
export async function execAgent(options: AgentExecOptions): Promise<string> {
  const { containerName, command, args, input } = options

  if (containerName) {
    const dockerArgs = ['exec', '-i', containerName, command, ...args]
    const result = await execa('docker', dockerArgs, {
      input,
      reject: false,
    })
    if (result.exitCode !== 0) {
      return result.stdout + '\n' + result.stderr
    }
    return result.stdout
  }

  const result = await execa(command, args, {
    input,
    reject: false,
  })
  if (result.exitCode !== 0) {
    return result.stdout + '\n' + result.stderr
  }
  return result.stdout
}
