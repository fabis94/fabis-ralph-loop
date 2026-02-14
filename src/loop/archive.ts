import { readFile, writeFile, mkdir, cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { consola } from 'consola'

const RALPH_DIR = '.ralph'
const PRD_FILE = join(RALPH_DIR, 'prd.json')
const PROGRESS_FILE = join(RALPH_DIR, 'progress.txt')
const LAST_BRANCH_FILE = join(RALPH_DIR, '.last-branch')
const ARCHIVE_DIR = join(RALPH_DIR, 'archive')

export async function archiveIfBranchChanged(): Promise<void> {
  if (!existsSync(PRD_FILE) || !existsSync(LAST_BRANCH_FILE)) {
    await trackCurrentBranch()
    return
  }

  let currentBranch: string
  try {
    const prd = JSON.parse(await readFile(PRD_FILE, 'utf8'))
    currentBranch = prd.branchName || ''
  } catch {
    return
  }

  let lastBranch: string
  try {
    lastBranch = (await readFile(LAST_BRANCH_FILE, 'utf8')).trim()
  } catch {
    lastBranch = ''
  }

  if (!currentBranch || !lastBranch || currentBranch === lastBranch) {
    await trackCurrentBranch()
    return
  }

  // Archive the previous run
  const date = new Date().toISOString().split('T')[0]
  const folderName = lastBranch.replace(/^ralph\//, '')
  const archiveFolder = join(ARCHIVE_DIR, `${date}-${folderName}`)

  consola.info(`Archiving previous run: ${lastBranch}`)
  await mkdir(archiveFolder, { recursive: true })

  if (existsSync(PRD_FILE)) {
    await cp(PRD_FILE, join(archiveFolder, 'prd.json'))
  }
  if (existsSync(PROGRESS_FILE)) {
    await cp(PROGRESS_FILE, join(archiveFolder, 'progress.txt'))
  }
  consola.info(`Archived to: ${archiveFolder}`)

  // Reset progress file
  await writeFile(
    PROGRESS_FILE,
    `# Ralph Progress Log\nStarted: ${new Date().toISOString()}\n---\n`,
  )

  await trackCurrentBranch()
}

async function trackCurrentBranch(): Promise<void> {
  if (!existsSync(PRD_FILE)) return

  try {
    const prd = JSON.parse(await readFile(PRD_FILE, 'utf8'))
    const branch = prd.branchName
    if (branch) {
      await mkdir(RALPH_DIR, { recursive: true })
      await writeFile(LAST_BRANCH_FILE, branch + '\n')
    }
  } catch {
    // PRD doesn't exist or is invalid, skip
  }
}

export async function ensureProgressFile(): Promise<void> {
  await mkdir(RALPH_DIR, { recursive: true })
  if (!existsSync(PROGRESS_FILE)) {
    await writeFile(
      PROGRESS_FILE,
      `# Ralph Progress Log\nStarted: ${new Date().toISOString()}\n---\n`,
    )
  }
}
