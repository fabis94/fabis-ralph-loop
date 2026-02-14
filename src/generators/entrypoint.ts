import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATIC_DIR = join(__dirname, '..', 'static')

export async function generateEntrypoint(): Promise<string> {
  return readFile(join(STATIC_DIR, 'entrypoint.ts'), 'utf8')
}
