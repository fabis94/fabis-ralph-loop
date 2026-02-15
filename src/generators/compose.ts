import { renderTemplate, GENERATED_HEADER } from '../utils/template.js'
import type { ResolvedConfig } from '../config/schema.js'

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

  return renderTemplate('docker-compose.yml.ejs', {
    generatedHeader: GENERATED_HEADER,
    containerName: config.container.name,
    shmSize: config.container.shmSize,
    networkMode: config.container.networkMode,
    capabilities: config.container.capabilities,
    shadowVolumes: config.container.shadowVolumes,
    persistVolumes,
    extraVolumes: config.container.volumes,
    env: config.container.env,
    homeDir,
  })
}
