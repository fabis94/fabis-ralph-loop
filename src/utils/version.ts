import { createRequire } from 'node:module'

export function getPackageVersion(): string {
  try {
    const require = createRequire(import.meta.url)
    const pkg = require('../../package.json') as { version: string }
    return pkg.version
  } catch {
    return 'latest'
  }
}
