import { defineConfig } from 'tsdown'
import { cp } from 'node:fs/promises'
import { join } from 'node:path'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: 'esm',
  dts: { isolatedDeclarations: false },
  hash: false,
  clean: true,
  async onSuccess() {
    // Copy templates and uac-templates to dist for runtime access
    await cp(join('src', 'templates'), join('dist', 'templates'), { recursive: true })
    await cp(join('src', 'uac-templates'), join('dist', 'uac-templates'), { recursive: true })
  },
})
