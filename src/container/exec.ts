import { execa } from 'execa'

interface AgentExecOptions {
  command: string
  args: string[]
  input?: string
  onData?: (chunk: Buffer) => void
  onStderr?: (chunk: Buffer) => void
  signal?: AbortSignal
}

interface AgentExecResult {
  stdout: string
  stderr: string
  exitCode: number
  aborted: boolean
}

/**
 * Execute a command directly as a child process.
 * Returns stdout, stderr, and exit code. If onData/onStderr are provided,
 * streams chunks in real-time. Supports AbortSignal for clean cancellation.
 */
export async function execAgent(options: AgentExecOptions): Promise<AgentExecResult> {
  const { command, args, input, onData, onStderr, signal } = options

  const proc = execa(command, args, { input, reject: false })

  if (onData && proc.stdout) {
    proc.stdout.on('data', onData)
  }
  if (onStderr && proc.stderr) {
    proc.stderr.on('data', onStderr)
  }

  let aborted = false
  if (signal) {
    const onAbort = () => {
      aborted = true
      proc.kill('SIGTERM')
    }
    if (signal.aborted) {
      onAbort()
    } else {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  const result = await proc
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode ?? 1,
    aborted,
  }
}
