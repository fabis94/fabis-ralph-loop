# Refactoring Audit Results

**Date:** 2026-02-15
**Scope:** Entire package (`src/`, `tests/`)
**Files scanned:** 38 (30 source, 8 test)
**Lines of code:** ~1,200
**Tooling status:** All checks pass (`pnpm check`, `pnpm test` — 58/58 tests)
**Detail level:** Execution

---

## Tier 2 — Do soon (score 8–11)

### Refactoring 1: Bug — dry-run flag skips skills preview (dead code)

**Priority score:** 10 | **Severity:** HIGH | **Effort:** S
**Category:** Dead code (bug)

`src/generators/index.ts:49-50` has an early `return files` inside the `if (options.dryRun)` block. This means the skills dry-run branch at lines 61-66 is **unreachable dead code**. Users running `fabis-ralph-loop generate --dry-run` never see what skills would be generated, and the `options.dryRun` check at line 61 is redundant (can only be `false` at that point).

#### Changes

1. **`src/generators/index.ts` (lines 42-72):**
   Remove the early return for dry-run. Restructure so that file-writing and skills-generation are both skipped (but logged) when `dryRun` is true:

   ```typescript
   // Replace lines 42-72 with:
   if (options.dryRun) {
     for (const file of files) {
       consola.info(`[dry-run] Would write: ${file.path}`)
     }
   } else {
     for (const file of files) {
       const fullPath = join(projectRoot, file.path)
       await mkdir(join(fullPath, '..'), { recursive: true })
       await writeFile(fullPath, file.content, 'utf8')
       consola.success(`Written: ${file.path}`)
     }
   }

   if (!options.only || options.only === 'skills') {
     if (options.dryRun) {
       consola.info('[dry-run] Would generate skills')
     } else {
       await generateSkills(config, projectRoot)
     }
   }

   return files
   ```

#### Verification

- `pnpm check`
- `pnpm test`
- Manual: `pnpm dev generate --dry-run` should now log skills preview

---

### Refactoring 2: `process.exit()` in `loadRalphConfig` prevents library use and testing

**Priority score:** 8 | **Severity:** MEDIUM | **Effort:** S
**Category:** Architecture

`src/config/loader.ts` calls `process.exit(1)` on missing config (line 14) and invalid config (line 19). This function is exported from `src/index.ts` as public API. Consumers importing `loadRalphConfig` as a library function can't catch these errors. It also makes this function untestable.

#### Changes

1. **`src/config/loader.ts` (lines 12-22):**
   Replace `process.exit(1)` with thrown errors:

   ```typescript
   if (!config || Object.keys(config).length === 0) {
     throw new Error('No fabis-ralph-loop config found. Run `fabis-ralph-loop init` to create one.')
   }

   const parsed = ralphLoopConfigSchema.safeParse(config)
   if (!parsed.success) {
     const issues = parsed.error.issues
       .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
       .join('\n')
     throw new Error(`Invalid fabis-ralph-loop config:\n${issues}`)
   }
   ```

   Note: this also fixes the typo `fabis-fabis-ralph-loop` in the error message (see Refactoring 3).

2. **`src/commands/*.ts`** — no changes needed. CLI commands that call `loadRalphConfig()` will get unhandled promise rejection -> non-zero exit. `citty` handles command-level errors and displays them. If you want explicit CLI error handling, wrap the call in the command's `run()`:
   ```typescript
   // Optional: if citty doesn't handle rejections well
   const config = await loadRalphConfig().catch((e) => {
     consola.error(e.message)
     process.exit(1)
   })
   ```
   But test first — citty likely handles this already.

#### Verification

- `pnpm check`
- `pnpm test`
- Test manually: rename config file, run `pnpm dev generate` — should show error and exit non-zero

---

## Tier 3 — Do eventually (score 4–7)

### Refactoring 3: Typo in error message

**Priority score:** 7 | **Severity:** MEDIUM | **Effort:** S
**Category:** Naming & readability

`src/config/loader.ts:14` says `fabis-fabis-ralph-loop` (doubled prefix).

#### Changes

1. **`src/config/loader.ts` (line 14):**
   Change `fabis-fabis-ralph-loop init` -> `fabis-ralph-loop init`

   (This is automatically fixed if Refactoring 2 is applied, since the error message text is rewritten there.)

#### Verification

- Read the error message text after change.

---

### Refactoring 4: Unsafe type assertions in exec command

**Priority score:** 7 | **Severity:** MEDIUM | **Effort:** S
**Category:** Type safety

`src/commands/exec.ts:22-25` uses multiple `as` type assertions to extract CLI arguments:

```typescript
const command = [
  args.command as string,
  ...(((args as Record<string, unknown>)._ as string[]) || []),
]
```

This is fragile and bypasses type safety at a user-input boundary.

#### Changes

1. **`src/commands/exec.ts` (lines 22-25):**
   Use safer narrowing:
   ```typescript
   const rest = (args as Record<string, unknown>)._
   const command = [String(args.command), ...(Array.isArray(rest) ? rest.map(String) : [])]
   ```

#### Verification

- `pnpm check`
- Manual: `pnpm dev exec -- ls -la` should still work

---

### Refactoring 5: No tests for `src/loop/runner.ts`

**Priority score:** 7 | **Severity:** HIGH | **Effort:** L
**Category:** Test coverage

The most complex file (166 lines) and highest git churn (4 changes in 9 commits) has zero tests. `runLoop` contains the core iteration loop with abort signal handling, agent execution, stream parsing, and completion detection.

#### Changes

1. **Create `tests/loop/runner.test.ts`:**
   Write characterization tests covering:
   - Completion signal detection stops the loop early
   - Max iterations reached sets `process.exitCode = 1`
   - Signal abort stops loop and sets `process.exitCode = 130`
   - `sleepBetweenMs` is respected between iterations
   - Verbose vs non-verbose mode uses correct stream handling
   - Agent execution failure is handled gracefully

   Mock `execAgent` from `../container/exec.js`, `archiveIfBranchChanged`/`ensureProgressFile` from `./archive.js`, and `readFile` for the prompt file.

   Test `buildAgentArgs` and `sleep` by extracting them or testing indirectly via `runLoop`.

#### Verification

- `pnpm test`

---

### Refactoring 6: No tests for `src/container/exec.ts` and `src/container/lifecycle.ts`

**Priority score:** 6 | **Severity:** MEDIUM | **Effort:** M
**Category:** Test coverage

`execAgent` (56 lines) handles child process execution with abort signals, stream piping, and error handling. `lifecycle.ts` (83 lines) manages Docker container start/stop with readiness polling.

#### Changes

1. **Create `tests/container/exec.test.ts`:**
   Test `execAgent` with mocked `execa`:
   - Basic command execution returns stdout/stderr/exitCode
   - `onData` callback receives chunks
   - AbortSignal cancels the process
   - Already-aborted signal kills immediately

2. **Create `tests/container/lifecycle.test.ts`:**
   Test with mocked `execa` and `isContainerRunning`:
   - `startContainer` validates `CLAUDE_CODE_OAUTH_TOKEN`
   - `startContainer` runs pre-start command when configured
   - `stopContainer` runs docker compose down
   - `waitForReady` polls until ready file exists

#### Verification

- `pnpm test`

---

### Refactoring 7: No tests for `src/generators/skills.ts`

**Priority score:** 5 | **Severity:** MEDIUM | **Effort:** M
**Category:** Test coverage

Skills generation has two distinct code paths (direct mode and UAC mode) with temp directory management, two-level EJS rendering, and UAC API integration — all untested.

#### Changes

1. **Create `tests/generators/skills.test.ts`:**
   Test with mocked `universal-ai-config` (`generate`/`writeGeneratedFiles`) and filesystem:
   - Direct mode: creates temp dir, renders Level 1 EJS, calls UAC generate, cleans up
   - UAC mode: renders Level 1 EJS, writes to uacTemplatesDir
   - Both modes: verify Level 1 variables are passed correctly
   - Cleanup: temp dir is removed even if generation fails

#### Verification

- `pnpm test`

---

### Refactoring 8: No tests for `src/loop/archive.ts`

**Priority score:** 5 | **Severity:** MEDIUM | **Effort:** M
**Category:** Test coverage

Branch tracking and archiving logic (86 lines) reads/writes JSON files and manages state across runs.

#### Changes

1. **Create `tests/loop/archive.test.ts`:**
   Test with mocked filesystem (`node:fs/promises`, `node:fs`):
   - No PRD file -> just tracks branch, no archive
   - Same branch -> no archive
   - Different branch -> archives prd.json + progress.txt, resets progress
   - `ensureProgressFile` creates file if missing, skips if exists

#### Verification

- `pnpm test`

---

### Refactoring 9: Outdated dependencies

**Priority score:** 5 | **Severity:** MEDIUM | **Effort:** M
**Category:** Dependency health

| Package             | Current | Latest   | Risk                             |
| ------------------- | ------- | -------- | -------------------------------- |
| `ejs`               | 3.1.10  | 4.0.1    | Major — may change template API  |
| `zod`               | 3.x     | 4.x      | Major — schema API changes       |
| `citty`             | 0.1.6   | 0.2.1    | Minor — likely safe              |
| `eslint` (dev)      | 9.x     | 10.x     | Major — config format may change |
| `vitest` (dev)      | 3.x     | 4.x      | Major — test API changes         |
| `c12`               | 3.x     | 4.0-beta | Skip — still beta                |
| `@types/node` (dev) | 22.x    | 25.x     | Major — type changes             |

#### Changes

1. Start with safe upgrades: `citty` 0.1.6 -> 0.2.1
2. Upgrade dev deps: `@types/node`, then `vitest`, then `eslint` (one at a time, running `pnpm check && pnpm test` after each)
3. Upgrade `ejs` 3->4: check for template syntax changes, run all generator tests
4. Hold `zod` 3->4 and `c12` 3->4 until they're stable and you can assess migration scope

#### Verification

- After each upgrade: `pnpm check && pnpm test`

---

### Refactoring 10: No tests for `src/config/loader.ts`

**Priority score:** 4 | **Severity:** LOW | **Effort:** S
**Category:** Test coverage

Config loader is 30 lines and mostly delegates to `c12` and `zod`. But it contains error handling logic (the `process.exit` calls, or thrown errors after Refactoring 2) worth verifying.

#### Changes

1. **Create `tests/config/loader.test.ts`:**
   Test with mocked `c12`:
   - Returns resolved config for valid input
   - Throws on missing config
   - Throws on invalid config with Zod issue details
   - Calls `applyPlaywrightDefaults`

#### Verification

- `pnpm test`

---

### Refactoring 11: No tests for `src/commands/`

**Priority score:** 4 | **Severity:** MEDIUM | **Effort:** L
**Category:** Test coverage

8 command files have no tests. They are thin wrappers, but some contain logic: `init.ts` scaffolds files, `run.ts` parses iterations, `exec.ts` handles rest args.

#### Changes

Lower priority since commands are thin wrappers. If pursued:

1. **Create `tests/commands/run.test.ts`:** Test iteration parsing and validation
2. **Create `tests/commands/init.test.ts`:** Test config file creation / skip-if-exists
3. Other commands are trivial enough to skip

#### Verification

- `pnpm test`

---

### Refactoring 12: Duplicated `makeConfig` test helper

**Priority score:** 4 | **Severity:** LOW | **Effort:** S
**Category:** DRY violations

The same 5-line `makeConfig(overrides)` function is copy-pasted across 5 test files (4 with `applyPlaywrightDefaults`, 1 without).

#### Changes

1. **Create `tests/helpers/make-config.ts`:**

   ```typescript
   import { ralphLoopConfigSchema } from '../../src/config/schema.js'
   import { applyPlaywrightDefaults } from '../../src/config/defaults.js'

   export function makeConfig(overrides: Record<string, unknown> = {}) {
     return applyPlaywrightDefaults(
       ralphLoopConfigSchema.parse({
         project: { name: 'Test' },
         ...overrides,
       }),
     )
   }

   export function makeRawConfig(overrides: Record<string, unknown> = {}) {
     return ralphLoopConfigSchema.parse({
       project: { name: 'Test' },
       ...overrides,
     })
   }
   ```

2. Update `tests/config/defaults.test.ts` to use `makeRawConfig`
3. Update `tests/generators/{compose,dockerfile,entrypoint,prompt}.test.ts` to use `makeConfig`

#### Verification

- `pnpm test`

---

### Refactoring 13: `parseStreamOutput` exported but only used in tests

**Priority score:** 4 | **Severity:** LOW | **Effort:** S
**Category:** Dead code

`src/loop/progress.ts:134` exports `parseStreamOutput` which is a convenience wrapper around `StreamProgressParser`. It has no production consumers — only `tests/loop/progress.test.ts` uses it.

#### Changes

**No action needed.** This is an intentional design choice for test convenience. The function provides a clean synchronous API for testing the parser without needing to instantiate and manage the class manually. The cost (one extra 5-line export) is negligible.

---

### Refactoring 14: `process.exit` in container lifecycle functions

**Priority score:** 4 | **Severity:** LOW | **Effort:** S
**Category:** Architecture

`src/container/lifecycle.ts` calls `process.exit()` in `startContainer` (line 20 — missing token) and `execInContainer` (line 83 — forwarding docker exit code). These are only called from CLI commands, not exported via `index.ts`.

#### Changes

**No action needed.** These are CLI-only functions that reasonably call `process.exit`. If `startContainer` or `execInContainer` are ever exposed as library API, refactor then.

---

## Categories with no findings

| Category                | Result                                                                         |
| ----------------------- | ------------------------------------------------------------------------------ |
| Dead code (files)       | All files have importers. No dead modules.                                     |
| Complexity hotspots     | No file exceeds 200 lines. Largest is `runner.ts` at 166.                      |
| Circular dependencies   | None detected.                                                                 |
| Type safety (`any`)     | Zero `any`, zero `@ts-ignore`, zero `@ts-expect-error` in all of src/.         |
| Security                | No `eval`, no raw `exec`/`spawn`, no hardcoded secrets. Uses `execa`.          |
| Architecture (coupling) | Well-structured. Most-imported module is `config/schema.js` (8) — appropriate. |

---

## Audit Summary

**Scope:** Entire package (`src/`, `tests/`)
**Files scanned:** 38
**Total findings:** 14

**Breakdown:**

- Tier 1 (critical): 0 findings
- Tier 2 (do soon): 2 findings -> 2 tasks
- Tier 3 (do eventually): 12 findings -> 10 tasks (2 no-action)

**Top 3 systemic issues:**

1. **Test coverage gaps** — 6 of 11 source modules have no tests. The tested modules (generators, config schema, progress parser) are well-covered, but the entire runtime path (commands -> container -> loop runner -> archive) is untested.
2. **`process.exit()` in library-exported functions** — `loadRalphConfig` is part of the public API but calls `process.exit` instead of throwing, making it unusable outside CLI context.
3. **Dead code path in dry-run** — The `--dry-run` flag has an early return that prevents skills preview from being shown, with a redundant/unreachable branch indicating the code was patched without full flow analysis.

**Quick wins (< 30 min, high impact):**

- **Fix dry-run bug** (Refactoring 1) — restructure early return in `generators/index.ts`
- **Replace `process.exit` with thrown errors** (Refactoring 2) — in `config/loader.ts`
- **Fix typo** (Refactoring 3) — `fabis-fabis-ralph-loop` -> `fabis-ralph-loop` (auto-fixed by Refactoring 2)
- **Safer type assertions** (Refactoring 4) — in `commands/exec.ts`

**Overall assessment:** The codebase is clean for its age. Zero type safety escapes (`any`, `@ts-ignore`), zero security issues, no circular dependencies, no dead files. The main debts are the dry-run bug and missing test coverage for the runtime path. The tested portions (generators, schema, parsing) have thorough, well-structured tests.
