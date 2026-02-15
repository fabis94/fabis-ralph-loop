import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('universal-ai-config', () => ({
  generate: vi.fn(),
  writeGeneratedFiles: vi.fn(),
}))
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
}))
vi.mock('node:os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}))
vi.mock('ejs', () => ({
  default: { render: vi.fn((template: string) => `rendered:${template}`) },
}))
vi.mock('../../src/utils/template.js', () => ({
  resolveAssetDir: vi.fn(() => '/fake/uac-templates'),
}))
vi.mock('consola', () => ({
  consola: { info: vi.fn() },
}))

import { generate, writeGeneratedFiles } from 'universal-ai-config'
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import ejs from 'ejs'
import { generateSkills } from '../../src/generators/skills.js'
import { ralphLoopConfigSchema } from '../../src/config/schema.js'
import { applyPlaywrightDefaults } from '../../src/config/defaults.js'

const mockGenerate = vi.mocked(generate)
const mockWriteGeneratedFiles = vi.mocked(writeGeneratedFiles)
const mockReaddir = vi.mocked(readdir)
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockMkdir = vi.mocked(mkdir)
const mockRm = vi.mocked(rm)
const mockEjsRender = vi.mocked(ejs.render)

function makeConfig(overrides: Record<string, unknown> = {}) {
  return applyPlaywrightDefaults(
    ralphLoopConfigSchema.parse({ project: { name: 'Test' }, ...overrides }),
  )
}

function mockSkillDirs(names: string[]) {
  mockReaddir.mockResolvedValue(names.map((name) => ({ name, isDirectory: () => true })) as never)
}

describe('generateSkills', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockEjsRender.mockImplementation((template: string) => `rendered:${template}`)
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue()
    mockRm.mockResolvedValue()
    mockReadFile.mockResolvedValue('template content' as never)
  })

  describe('direct mode', () => {
    it('renders templates and calls UAC generate', async () => {
      mockSkillDirs(['prd', 'ralph'])
      mockGenerate.mockResolvedValue([{ path: '.claude/skills/prd.md', content: 'skill' }] as never)
      mockWriteGeneratedFiles.mockResolvedValue(undefined as never)

      const config = makeConfig({ output: { mode: 'direct' } })
      await generateSkills(config, '/project')

      // Reads each skill template
      expect(mockReadFile).toHaveBeenCalledWith('/fake/uac-templates/skills/prd/SKILL.md', 'utf8')
      expect(mockReadFile).toHaveBeenCalledWith('/fake/uac-templates/skills/ralph/SKILL.md', 'utf8')

      // Renders with EJS (Level 1)
      expect(mockEjsRender).toHaveBeenCalledTimes(2)
      expect(mockEjsRender).toHaveBeenCalledWith(
        'template content',
        expect.objectContaining({ projectName: 'Test' }),
      )

      // Writes to temp dir
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/tmp\/ralph-skills-\d+\/skills\/prd\/SKILL\.md/),
        expect.stringContaining('rendered:'),
        'utf8',
      )

      // Calls UAC generate and writeGeneratedFiles
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          root: '/project',
          targets: ['claude'],
          types: ['skills'],
        }),
      )
      expect(mockWriteGeneratedFiles).toHaveBeenCalled()
    })

    it('cleans up temp dir after generation', async () => {
      mockSkillDirs(['prd'])
      mockGenerate.mockResolvedValue([] as never)
      mockWriteGeneratedFiles.mockResolvedValue(undefined as never)

      const config = makeConfig({ output: { mode: 'direct' } })
      await generateSkills(config, '/project')

      expect(mockRm).toHaveBeenCalledWith(expect.stringMatching(/\/tmp\/ralph-skills-\d+/), {
        recursive: true,
        force: true,
      })
    })

    it('cleans up temp dir even if generation fails', async () => {
      mockSkillDirs(['prd'])
      mockGenerate.mockRejectedValue(new Error('UAC failed'))

      const config = makeConfig({ output: { mode: 'direct' } })
      await expect(generateSkills(config, '/project')).rejects.toThrow('UAC failed')

      expect(mockRm).toHaveBeenCalledWith(expect.stringMatching(/\/tmp\/ralph-skills-\d+/), {
        recursive: true,
        force: true,
      })
    })
  })

  describe('uac mode', () => {
    it('renders templates and writes to uacTemplatesDir', async () => {
      mockSkillDirs(['prd'])

      const config = makeConfig({ output: { mode: 'uac' } })
      await generateSkills(config, '/project')

      // Reads the skill template
      expect(mockReadFile).toHaveBeenCalledWith('/fake/uac-templates/skills/prd/SKILL.md', 'utf8')

      // Renders with EJS (Level 1)
      expect(mockEjsRender).toHaveBeenCalledWith(
        'template content',
        expect.objectContaining({ projectName: 'Test' }),
      )

      // Writes to uacTemplatesDir (not temp dir)
      expect(mockMkdir).toHaveBeenCalledWith('/project/.universal-ai-config/skills/prd', {
        recursive: true,
      })
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/project/.universal-ai-config/skills/prd/SKILL.md',
        expect.stringContaining('rendered:'),
        'utf8',
      )

      // Should NOT call UAC generate API
      expect(mockGenerate).not.toHaveBeenCalled()
      expect(mockWriteGeneratedFiles).not.toHaveBeenCalled()
    })

    it('passes Level 1 variables to EJS render', async () => {
      mockSkillDirs(['prd'])

      const config = makeConfig({
        output: { mode: 'uac' },
        project: {
          name: 'MyApp',
          context: 'A web app',
          backpressureCommands: [{ name: 'lint', command: 'pnpm lint' }],
          openAppSkill: '/open-app',
        },
        container: { name: 'test', playwright: true },
      })
      await generateSkills(config, '/project')

      expect(mockEjsRender).toHaveBeenCalledWith(
        'template content',
        expect.objectContaining({
          projectName: 'MyApp',
          projectContext: 'A web app',
          backpressureCommands: [{ name: 'lint', command: 'pnpm lint' }],
          openAppSkill: '/open-app',
          playwright: true,
          config,
        }),
      )
    })
  })
})
