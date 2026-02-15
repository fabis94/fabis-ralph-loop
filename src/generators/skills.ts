import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import ejs from 'ejs'
import { consola } from 'consola'
import { generate, writeGeneratedFiles } from 'universal-ai-config'
import type { ResolvedConfig } from '../config/schema.js'
import { resolveAssetDir } from '../utils/template.js'

const UAC_TEMPLATES_DIR = resolveAssetDir('uac-templates', import.meta.url)

function buildLevel1Variables(config: ResolvedConfig): Record<string, unknown> {
  return {
    backpressureCommands: config.project.backpressureCommands,
    projectName: config.project.name,
    projectContext: config.project.context,
    openAppSkill: config.project.openAppSkill,
    playwright: config.container.playwright,
    config,
  }
}

async function discoverSkills(): Promise<string[]> {
  const skillsDir = join(UAC_TEMPLATES_DIR, 'skills')
  const entries = await readdir(skillsDir, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

export async function generateSkills(config: ResolvedConfig, projectRoot: string): Promise<void> {
  if (config.output.mode === 'direct') {
    await generateDirect(config, projectRoot)
  } else {
    await generateUac(config, projectRoot)
  }
}

async function generateDirect(config: ResolvedConfig, projectRoot: string): Promise<void> {
  const variables = buildLevel1Variables(config)
  const skills = await discoverSkills()

  // Render Level 1 EJS and write to a temp dir structured as UAC templates
  const tempDir = join(tmpdir(), `ralph-skills-${Date.now()}`)

  try {
    for (const skill of skills) {
      const templatePath = join(UAC_TEMPLATES_DIR, 'skills', skill, 'SKILL.md')
      const template = await readFile(templatePath, 'utf8')
      const rendered = ejs.render(template, variables) as string

      const outDir = join(tempDir, 'skills', skill)
      await mkdir(outDir, { recursive: true })
      await writeFile(join(outDir, 'SKILL.md'), rendered, 'utf8')
    }

    // Use UAC's generate() API for the second pass (handles Level 2 EJS + frontmatter mapping)
    const files = await generate({
      root: projectRoot,
      targets: ['claude'],
      types: ['skills'],
      overrides: { templatesDir: tempDir },
    })

    await writeGeneratedFiles(files, projectRoot)
    consola.info(`Generated ${files.length} skill file(s)`)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function generateUac(config: ResolvedConfig, projectRoot: string): Promise<void> {
  const variables = buildLevel1Variables(config)
  const skills = await discoverSkills()
  let count = 0

  for (const skill of skills) {
    const templatePath = join(UAC_TEMPLATES_DIR, 'skills', skill, 'SKILL.md')
    const template = await readFile(templatePath, 'utf8')
    // Render Level 1 EJS — Level 2 <%% %> becomes <% %> in output
    const rendered = ejs.render(template, variables) as string

    const outDir = join(projectRoot, config.output.uacTemplatesDir, 'skills', skill)
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, 'SKILL.md'), rendered, 'utf8')
    count++
  }

  consola.info(`Generated ${count} skill template(s) to ${config.output.uacTemplatesDir}/skills/`)
}
