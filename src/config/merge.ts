/**
 * Deep merge two config objects.
 *
 * Merge strategy:
 * - Arrays: overrides REPLACE base arrays entirely
 * - Plain objects: merge recursively
 * - Scalars: overrides replace base values
 * - undefined values in overrides are skipped
 */
export function mergeConfigs<T extends Record<string, unknown>>(
  base: T,
  overrides: Record<string, unknown>,
): T {
  return deepMerge(base, overrides) as T
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }

  for (const key of Object.keys(overrides)) {
    const overrideValue = overrides[key]
    const baseValue = base[key]

    if (overrideValue === undefined) continue

    if (Array.isArray(overrideValue)) {
      result[key] = overrideValue
    } else if (isPlainObject(overrideValue) && isPlainObject(baseValue)) {
      result[key] = deepMerge(baseValue, overrideValue)
    } else {
      result[key] = overrideValue
    }
  }

  return result
}
