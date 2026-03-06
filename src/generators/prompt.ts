import { renderTemplate, GENERATED_HEADER } from '../utils/template.js'
import type { ResolvedConfig } from '../config/schema.js'
import { normalizeOpenAppSkills } from './normalize.js'

export async function generatePrompt(config: ResolvedConfig): Promise<string> {
  return renderTemplate('ralph-prompt.md.ejs', {
    generatedHeader: GENERATED_HEADER,
    projectName: config.project.name,
    projectDescription: config.project.description,
    projectContext: config.project.context,
    backpressureCommands: config.project.backpressureCommands,
    openAppSkills: normalizeOpenAppSkills(config.project.openAppSkill),
    playwright: config.container.playwright,
    blockedDomains: config.container.blockedDomains,
    completionSignal: config.defaults.completionSignal,
  })
}
