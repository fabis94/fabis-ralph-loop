import { defineCommand } from 'citty'
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { consola } from 'consola'
import { loadRalphConfig } from '../config/loader.js'
import { generateAll } from '../generators/index.js'

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
    backpressureCommands: [
      { name: 'Build', command: 'npm run build' },
      { name: 'Lint', command: 'npm run lint' },
      { name: 'Typecheck', command: 'tsc --noEmit' },
    ],
  },
})
`

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold ralph-loop config and generate all files',
  },
  async run() {
    const configPath = 'ralph-loop.config.ts'

    if (existsSync(configPath)) {
      consola.warn(`${configPath} already exists. Regenerating files from existing config.`)
    } else {
      await writeFile(configPath, SAMPLE_CONFIG, 'utf8')
      consola.success(`Created ${configPath}`)
    }

    // Load config and generate
    const config = await loadRalphConfig()
    await generateAll(config, process.cwd())

    consola.success(
      'Init complete. Edit ralph-loop.config.ts and run `fabis-ralph-loop generate` to regenerate.',
    )
  },
})
