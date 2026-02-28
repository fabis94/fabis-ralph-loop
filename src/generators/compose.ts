import { isAbsolute } from 'node:path'
import { renderTemplate, GENERATED_HEADER } from '../utils/template.js'
import type { ResolvedConfig } from '../config/schema.js'

/**
 * Resolve a host path for use in docker-compose volumes.
 * Relative paths get `../` prepended since compose runs from `.ralph-container/`.
 */
function resolveHostPath(hostPath: string): string {
  return isAbsolute(hostPath) ? hostPath : `../${hostPath}`
}

export async function generateCompose(config: ResolvedConfig): Promise<string> {
  const homeDir = `/home/${config.container.user}`

  // Ensure .claude config is always persisted with the correct home dir
  const persistVolumes: Record<string, string> = {
    'ralph-claude-config': `${homeDir}/.claude`,
    ...Object.fromEntries(
      Object.entries(config.container.persistVolumes).map(([name, path]) => [
        name,
        path.replace('/home/sandbox', homeDir),
      ]),
    ),
  }

  const sslCertsVolume = config.container.sslCerts
    ? `${resolveHostPath(config.container.sslCerts)}:/tmp/ssl-certs:ro`
    : undefined

  return renderTemplate('docker-compose.yml.ejs', {
    generatedHeader: GENERATED_HEADER,
    containerName: config.container.name,
    shmSize: config.container.shmSize,
    networkMode: config.container.networkMode,
    capabilities: config.container.capabilities,
    shadowVolumes: config.container.shadowVolumes,
    persistVolumes,
    extraVolumes: config.container.volumes,
    sslCertsVolume,
    env: config.container.env,
    homeDir,
  })
}
