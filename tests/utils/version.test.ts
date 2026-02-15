import { describe, it, expect } from 'vitest'
import { getPackageVersion } from '../../src/utils/version.js'

describe('getPackageVersion', () => {
  it('returns a valid semver version string', () => {
    const version = getPackageVersion()

    // Should be a valid semver (e.g. "0.1.0") or "latest" as fallback
    expect(version).toMatch(/^\d+\.\d+\.\d+|^latest$/)
  })
})
