import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  cp: vi.fn(),
}))
vi.mock('consola', () => ({
  consola: { info: vi.fn() },
}))

import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises'
import { archiveIfBranchChanged, ensureProgressFile } from '../../src/loop/archive.js'

const mockExistsSync = vi.mocked(existsSync)
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockMkdir = vi.mocked(mkdir)
const mockCp = vi.mocked(cp)

describe('archiveIfBranchChanged', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue()
    mockCp.mockResolvedValue()
  })

  it('just tracks branch when PRD file does not exist', async () => {
    mockExistsSync.mockReturnValue(false)

    await archiveIfBranchChanged()

    expect(mockCp).not.toHaveBeenCalled()
  })

  it('just tracks branch when last-branch file does not exist', async () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('prd.json')) return true
      return false
    })
    mockReadFile.mockResolvedValue(JSON.stringify({ branchName: 'ralph/feature' }) as never)

    await archiveIfBranchChanged()

    expect(mockCp).not.toHaveBeenCalled()
    // Should track the current branch
    expect(mockWriteFile).toHaveBeenCalledWith('.ralph/.last-branch', 'ralph/feature\n')
  })

  it('does not archive when branch has not changed', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ branchName: 'ralph/feature' }) as never)
      .mockResolvedValueOnce('ralph/feature\n' as never)
      // trackCurrentBranch reads PRD again
      .mockResolvedValueOnce(JSON.stringify({ branchName: 'ralph/feature' }) as never)

    await archiveIfBranchChanged()

    expect(mockCp).not.toHaveBeenCalled()
  })

  it('archives when branch has changed', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ branchName: 'ralph/new-feature' }) as never)
      .mockResolvedValueOnce('ralph/old-feature\n' as never)
      // trackCurrentBranch reads PRD again
      .mockResolvedValueOnce(JSON.stringify({ branchName: 'ralph/new-feature' }) as never)

    await archiveIfBranchChanged()

    // Should create archive directory
    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('.ralph/archive/'), {
      recursive: true,
    })

    // Should copy prd.json and progress.txt to archive
    expect(mockCp).toHaveBeenCalledTimes(2)
    expect(mockCp).toHaveBeenCalledWith('.ralph/prd.json', expect.stringContaining('prd.json'))
    expect(mockCp).toHaveBeenCalledWith(
      '.ralph/progress.txt',
      expect.stringContaining('progress.txt'),
    )

    // Should reset progress file
    expect(mockWriteFile).toHaveBeenCalledWith(
      '.ralph/progress.txt',
      expect.stringContaining('# Ralph Progress Log'),
    )

    // Should track new branch
    expect(mockWriteFile).toHaveBeenCalledWith('.ralph/.last-branch', 'ralph/new-feature\n')
  })

  it('strips ralph/ prefix from archive folder name', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ branchName: 'ralph/my-branch' }) as never)
      .mockResolvedValueOnce('ralph/old-branch\n' as never)
      .mockResolvedValueOnce(JSON.stringify({ branchName: 'ralph/my-branch' }) as never)

    await archiveIfBranchChanged()

    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringMatching(/\.ralph\/archive\/\d{4}-\d{2}-\d{2}-old-branch/),
      { recursive: true },
    )
  })

  it('handles invalid PRD JSON gracefully', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFile.mockResolvedValueOnce('not json' as never)

    await archiveIfBranchChanged()

    expect(mockCp).not.toHaveBeenCalled()
  })
})

describe('ensureProgressFile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue()
  })

  it('creates progress file when it does not exist', async () => {
    mockExistsSync.mockReturnValue(false)

    await ensureProgressFile()

    expect(mockMkdir).toHaveBeenCalledWith('.ralph', { recursive: true })
    expect(mockWriteFile).toHaveBeenCalledWith(
      '.ralph/progress.txt',
      expect.stringContaining('# Ralph Progress Log'),
    )
  })

  it('does not overwrite existing progress file', async () => {
    mockExistsSync.mockReturnValue(true)

    await ensureProgressFile()

    expect(mockMkdir).toHaveBeenCalledWith('.ralph', { recursive: true })
    expect(mockWriteFile).not.toHaveBeenCalled()
  })
})
