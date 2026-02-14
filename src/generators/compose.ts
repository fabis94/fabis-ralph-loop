import { renderTemplate, GENERATED_HEADER } from '../utils/template.js'
import type { ResolvedConfig } from '../config/schema.js'

export async function generateCompose(config: ResolvedConfig): Promise<string> {
  return renderTemplate('docker-compose.yml.ejs', {
    generatedHeader: GENERATED_HEADER,
    containerName: config.container.name,
    shmSize: config.container.shmSize,
    networkMode: config.container.networkMode,
    capabilities: config.container.capabilities,
    shadowVolumes: config.container.shadowVolumes,
    shadowVolumesEnv: config.container.shadowVolumes.join(','),
    agent: config.defaults.agent,
    persistVolumes: config.container.persistVolumes,
    extraVolumes: config.container.volumes,
    env: config.container.env,
  })
}
