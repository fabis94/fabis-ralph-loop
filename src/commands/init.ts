import { defineCommand } from 'citty'
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { consola } from 'consola'
import { loadRalphConfig } from '../config/loader.js'
import { generateAll } from '../generators/index.js'
import { ensureGitignoreBlock } from '../utils/gitignore.js'

const SAMPLE_CONFIG = `import { defineConfig } from 'fabis-ralph-loop'

export default defineConfig({
  container: {
    name: 'my-ralph-container',
    baseImage: 'node:22-bookworm',
    // playwright: true,
    // shadowVolumes: ['/workspace/node_modules'],
    hooks: {
      rootSetup: [
        // 'RUN npm install -g pnpm@10',
      ],
      userSetup: [
        // 'RUN corepack enable',
      ],
    },
  },
  project: {
    name: 'My Project',
    description: '',
    context: '- **Monorepo** managed with npm\\n- **TypeScript strict mode** everywhere',
  },
  output: {
    mode: 'direct',
  },
})
`

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold ralph-loop config and generate all files',
  },
  async run() {
    const configPath = 'fabis-ralph-loop.config.ts'

    if (existsSync(configPath)) {
      consola.warn(`${configPath} already exists. Regenerating files from existing config.`)
    } else {
      await writeFile(configPath, SAMPLE_CONFIG, 'utf8')
      consola.success(`Created ${configPath}`)
    }

    await ensureGitignoreBlock()

    // Load config and generate
    const config = await loadRalphConfig()
    await generateAll(config, process.cwd())

    consola.success(
      'Init complete. Edit fabis-ralph-loop.config.ts and run `fabis-ralph-loop generate` to regenerate.',
    )
  },
})
