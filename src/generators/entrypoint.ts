import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveAssetDir } from '../utils/template.js'

const STATIC_DIR = resolveAssetDir('static', import.meta.url)

export async function generateEntrypoint(): Promise<string> {
  return readFile(join(STATIC_DIR, 'entrypoint.ts'), 'utf8')
}
