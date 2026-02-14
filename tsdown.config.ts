import { defineConfig } from 'tsdown'
import { cp } from 'node:fs/promises'
import { join } from 'node:path'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  target: 'node22',
  outDir: 'dist',
  async onSuccess() {
    // Copy templates, static files, and uac-templates to dist for runtime access
    await cp(join('src', 'templates'), join('dist', 'templates'), { recursive: true })
    await cp(join('src', 'static'), join('dist', 'static'), { recursive: true })
    await cp(join('src', 'uac-templates'), join('dist', 'uac-templates'), { recursive: true })
  },
})
