import { renderTemplate, GENERATED_HEADER } from '../utils/template.js'
import type { ResolvedConfig } from '../config/schema.js'

export async function generateEntrypoint(config: ResolvedConfig): Promise<string> {
  const user = config.container.user
  return renderTemplate('entrypoint.ts.ejs', {
    generatedHeader: GENERATED_HEADER.replace(/^# /gm, '// '),
    agent: config.defaults.agent,
    shadowVolumes: config.container.shadowVolumes,
    entrypointSetup: config.container.hooks.entrypointSetup,
    user,
    homeDir: `/home/${user}`,
  })
}
