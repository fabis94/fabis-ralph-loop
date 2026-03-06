export function normalizeOpenAppSkills(value: string | string[]): string[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}
