import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureGitignoreBlock } from '../../src/utils/gitignore.js'

describe('ensureGitignoreBlock', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ralph-gitignore-'))
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('creates .gitignore with block when file does not exist', async () => {
    await ensureGitignoreBlock(testDir)

    const content = await readFile(join(testDir, '.gitignore'), 'utf8')
    expect(content).toContain('# >>> fabis-ralph-loop >>>')
    expect(content).toContain('/fabis-ralph-loop.overrides.*')
    expect(content).toContain('# <<< fabis-ralph-loop <<<')
    expect(content.endsWith('\n')).toBe(true)
  })

  it('appends block to existing .gitignore', async () => {
    await writeFile(join(testDir, '.gitignore'), 'node_modules\ndist\n', 'utf8')

    await ensureGitignoreBlock(testDir)

    const content = await readFile(join(testDir, '.gitignore'), 'utf8')
    expect(content).toContain('node_modules')
    expect(content).toContain('dist')
    expect(content).toContain('# >>> fabis-ralph-loop >>>')
    expect(content).toContain('/fabis-ralph-loop.overrides.*')
  })

  it('is idempotent — does not duplicate block', async () => {
    await ensureGitignoreBlock(testDir)
    await ensureGitignoreBlock(testDir)
    await ensureGitignoreBlock(testDir)

    const content = await readFile(join(testDir, '.gitignore'), 'utf8')
    const matches = content.match(/# >>> fabis-ralph-loop >>>/g)
    expect(matches).toHaveLength(1)
  })

  it('preserves existing block when re-run', async () => {
    const existing = `node_modules

# >>> fabis-ralph-loop >>>
/fabis-ralph-loop.overrides.*
# <<< fabis-ralph-loop <<<
`
    await writeFile(join(testDir, '.gitignore'), existing, 'utf8')

    await ensureGitignoreBlock(testDir)

    const content = await readFile(join(testDir, '.gitignore'), 'utf8')
    expect(content).toBe(existing)
  })

  it('separates block from existing content with blank line', async () => {
    await writeFile(join(testDir, '.gitignore'), 'node_modules', 'utf8')

    await ensureGitignoreBlock(testDir)

    const content = await readFile(join(testDir, '.gitignore'), 'utf8')
    expect(content).toContain('node_modules\n\n# >>> fabis-ralph-loop >>>')
  })
})
