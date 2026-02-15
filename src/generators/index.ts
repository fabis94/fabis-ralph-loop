import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { consola } from 'consola'
import { generateDockerfile } from './dockerfile.js'
import { generateCompose } from './compose.js'
import { generateEntrypoint } from './entrypoint.js'
import { generatePrompt } from './prompt.js'
import { generateSkills } from './skills.js'
import type { ResolvedConfig } from '../config/schema.js'

interface GenerateOptions {
  dryRun?: boolean
  only?: 'container' | 'prompt' | 'skills'
}

interface GeneratedFile {
  path: string
  content: string
}

export async function generateAll(
  config: ResolvedConfig,
  projectRoot: string,
  options: GenerateOptions = {},
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = []

  if (!options.only || options.only === 'container') {
    const containerDir = join(projectRoot, '.ralph-container')
    await mkdir(containerDir, { recursive: true })

    const dockerfile = await generateDockerfile(config)
    files.push({ path: join('.ralph-container', 'Dockerfile'), content: dockerfile })

    const entrypoint = await generateEntrypoint(config)
    files.push({ path: join('.ralph-container', 'entrypoint.ts'), content: entrypoint })

    const compose = await generateCompose(config)
    files.push({ path: join('.ralph-container', 'docker-compose.yml'), content: compose })
  }

  if (!options.only || options.only === 'prompt') {
    const prompt = await generatePrompt(config)
    files.push({ path: join('.ralph-container', 'ralph-prompt.md'), content: prompt })
  }

  if (options.dryRun) {
    for (const file of files) {
      consola.info(`[dry-run] Would write: ${file.path}`)
    }
    return files
  }

  // Write files
  for (const file of files) {
    const fullPath = join(projectRoot, file.path)
    await mkdir(join(fullPath, '..'), { recursive: true })
    await writeFile(fullPath, file.content, 'utf8')
    consola.success(`Written: ${file.path}`)
  }

  // Skills are handled separately (UAC integration)
  if (!options.only || options.only === 'skills') {
    if (!options.dryRun) {
      await generateSkills(config, projectRoot)
    } else {
      consola.info('[dry-run] Would generate skills')
    }
  }

  return files
}
