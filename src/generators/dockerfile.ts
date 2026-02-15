import { renderTemplate, GENERATED_HEADER } from '../utils/template.js'
import { getPackageVersion } from '../utils/version.js'
import type { ResolvedConfig } from '../config/schema.js'

/**
 * Detect whether the base image already includes Node.js.
 */
function isNodeBaseImage(baseImage: string): boolean {
  return /^node[:/]/i.test(baseImage)
}

export async function generateDockerfile(config: ResolvedConfig): Promise<string> {
  const user = config.container.user
  return renderTemplate('Dockerfile.ejs', {
    generatedHeader: GENERATED_HEADER,
    baseImage: config.container.baseImage,
    systemPackages: config.container.systemPackages,
    installNode: !isNodeBaseImage(config.container.baseImage),
    playwright: config.container.playwright,
    hooks: config.container.hooks,
    user,
    createUser: user === 'sandbox',
    homeDir: `/home/${user}`,
    packageVersion: getPackageVersion(),
  })
}
