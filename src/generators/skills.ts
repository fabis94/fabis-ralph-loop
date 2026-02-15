import { readFile, writeFile, cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import ejs from 'ejs'
import { consola } from 'consola'
import type { ResolvedConfig } from '../config/schema.js'
import { resolveAssetDir } from '../utils/template.js'

const UAC_TEMPLATES_DIR = resolveAssetDir('uac-templates', import.meta.url)

export async function generateSkills(config: ResolvedConfig, projectRoot: string): Promise<void> {
  if (config.output.mode === 'direct') {
    await generateDirect(config, projectRoot)
  } else {
    await copyUacTemplates(config, projectRoot)
  }
}

async function generateDirect(config: ResolvedConfig, projectRoot: string): Promise<void> {
  const variables = {
    backpressureCommands: config.project.backpressureCommands,
    projectName: config.project.name,
    projectContext: config.project.context,
    openAppSkill: config.project.openAppSkill,
    playwright: config.container.playwright,
  }

  // Render each skill template with EJS and write to .claude/skills/
  const skillDirs = ['prd', 'ralph']
  let count = 0

  for (const skill of skillDirs) {
    const templatePath = join(UAC_TEMPLATES_DIR, 'skills', skill, 'SKILL.md')
    const template = await readFile(templatePath, 'utf8')
    const rendered = ejs.render(template, variables) as string

    const outDir = join(projectRoot, '.claude', 'skills', skill)
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, 'SKILL.md'), rendered, 'utf8')
    count++
  }

  consola.info(`Generated ${count} skill file(s)`)
}

async function copyUacTemplates(config: ResolvedConfig, projectRoot: string): Promise<void> {
  const destDir = join(projectRoot, config.output.uacTemplatesDir, 'skills')
  await mkdir(destDir, { recursive: true })
  await cp(join(UAC_TEMPLATES_DIR, 'skills'), destDir, { recursive: true })
  consola.info(`Copied UAC skill templates to ${config.output.uacTemplatesDir}/skills/`)
}
