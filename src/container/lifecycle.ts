import { execa } from 'execa'
import { consola } from 'consola'
import { isContainerRunning } from '../utils/docker.js'
import type { ResolvedConfig } from '../config/schema.js'

const COMPOSE_FILE = '.ralph-container/docker-compose.yml'
const READY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const POLL_INTERVAL_MS = 1000

export async function startContainer(
  config: ResolvedConfig,
  options: { noAttach?: boolean } = {},
): Promise<void> {
  // Validate token
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    consola.error(
      'CLAUDE_CODE_OAUTH_TOKEN is not set.\n' +
        'Run: export CLAUDE_CODE_OAUTH_TOKEN=$(claude auth token)',
    )
    process.exit(1)
  }

  // Run pre-start command
  if (config.setup.preStartCommand) {
    consola.info(`Running pre-start command: ${config.setup.preStartCommand}`)
    await execa('sh', ['-c', config.setup.preStartCommand], { stdio: 'inherit' })
  }

  const running = await isContainerRunning(config.container.name)
  if (!running) {
    consola.info('Starting Ralph container...')
    await execa('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', '--build'], {
      stdio: 'inherit',
    })

    consola.info('Waiting for container initialization...')
    await waitForReady(config.container.name)
  } else {
    consola.info('Ralph container already running.')
  }

  if (!options.noAttach) {
    consola.info('Attaching to container...')
    const result = await execa('docker', ['exec', '-it', config.container.name, 'bash'], {
      stdio: 'inherit',
      reject: false,
    })
    process.exit(result.exitCode ?? 0)
  }
}

async function waitForReady(containerName: string): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < READY_TIMEOUT_MS) {
    try {
      await execa('docker', ['exec', containerName, 'test', '-f', '/tmp/entrypoint-ready'])
      consola.success('Container ready.')
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }

  consola.warn('Container did not become ready within 5 minutes. Proceeding anyway.')
}

export async function stopContainer(): Promise<void> {
  consola.info('Stopping Ralph container...')
  await execa('docker', ['compose', '-f', COMPOSE_FILE, 'down'], { stdio: 'inherit' })
}

export async function showLogs(containerName: string): Promise<void> {
  await execa('docker', ['logs', containerName, '--follow'], { stdio: 'inherit' })
}

export async function execInContainer(containerName: string, command: string[]): Promise<void> {
  const result = await execa('docker', ['exec', '-it', containerName, ...command], {
    stdio: 'inherit',
    reject: false,
  })
  process.exit(result.exitCode ?? 0)
}
