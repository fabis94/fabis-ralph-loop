import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const MARKER_START = '# >>> fabis-ralph-loop >>>'
const MARKER_END = '# <<< fabis-ralph-loop <<<'

const GITIGNORE_BLOCK = `${MARKER_START}
/fabis-ralph-loop.overrides.*
${MARKER_END}`

/**
 * Idempotently add fabis-ralph-loop gitignore entries to .gitignore.
 * Uses marker comments to detect existing blocks and avoid duplication.
 */
export async function ensureGitignoreBlock(cwd: string = process.cwd()): Promise<void> {
  const gitignorePath = join(cwd, '.gitignore')

  let content = ''
  if (existsSync(gitignorePath)) {
    content = await readFile(gitignorePath, 'utf8')
  }

  if (content.includes(MARKER_START)) return

  const newContent = content.trimEnd()
    ? `${content.trimEnd()}\n\n${GITIGNORE_BLOCK}\n`
    : `${GITIGNORE_BLOCK}\n`

  await writeFile(gitignorePath, newContent, 'utf8')
}
