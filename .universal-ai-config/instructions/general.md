---
description: General project conventions and development guidelines for fabis-ralph-loop
alwaysApply: true
---

# fabis-ralph-loop

CLI npm package that extracts the common Claude Ralph autonomous coding loop container setup into a reusable package. Consumers define a `fabis-ralph-loop.config.ts`, then use the CLI to generate Docker artifacts (Dockerfile, docker-compose.yml, entrypoint, prompt), manage the container lifecycle, and run iterative autonomous coding loops.

## Tech Stack

- **Runtime**: Node.js >= 22, ESM-only (`"type": "module"`)
- **Package manager**: pnpm
- **Build**: tsdown (NOT tsup) — entry points: `src/index.ts` (library), `src/cli.ts` (CLI binary)
- **Test**: vitest
- **Lint**: ESLint with `typescript-eslint` strict config (no explicit `any`)
- **Format**: Prettier
- **Dead code**: knip
- **Git hooks**: husky + lint-staged

## Key Libraries

- **citty** — CLI framework (unjs), lazy-loaded subcommands
- **c12** — Config loading (`fabis-ralph-loop.config.ts`)
- **consola** — Logging
- **execa** — Process execution (Docker commands, agent invocations)
- **ejs** — Template rendering (Dockerfile, compose, prompt)
- **zod** — Config schema validation

## Project Structure

- `src/config/` — Zod schema, defaults (Playwright auto-config), config loader (c12)
- `src/commands/` — CLI subcommands (init, generate, start, stop, restart, logs, run, exec)
- `src/generators/` — File generators (Dockerfile, compose, entrypoint, prompt, skills)
- `src/templates/` — EJS templates (Dockerfile.ejs, docker-compose.yml.ejs, ralph-prompt.md.ejs)
- `src/static/` — Static files copied as-is (entrypoint.ts — reads config from env vars, not templated)
- `src/uac-templates/` — UAC skill templates for direct copy or EJS rendering
- `src/container/` — Docker container lifecycle and exec helpers
- `src/loop/` — Ralph loop runner, progress parser, branch archive logic
- `src/utils/` — Shared utilities (template rendering, Docker helpers)
- `src/index.ts` — Public API exports
- `tests/` — Mirrors `src/` structure

## Conventions

- Use `.js` extensions in all imports (TypeScript with ESM resolution)
- Use `node:` prefix for Node.js built-in modules (e.g. `node:fs/promises`, `node:path`)
- Use `utf8` (not `utf-8`) in encoding arguments
- Validate all external input with Zod at system boundaries; trust internal types
- Use `consola` for all user-facing logging — never raw `console.log`
- Config types: `RalphLoopConfig` = user input, `ResolvedConfig` = after Zod parse + defaults
- Static files in `src/static/` are copied to `dist/static/` at build time (not compiled) — knip ignores them

## Scripts

- `pnpm check` — runs all checks: eslint, prettier --check, tsc --noEmit, knip
- `pnpm test` — vitest run
- `pnpm build` — tsdown (also copies templates/, static/, uac-templates/ to dist/)

## Testing

- Tests live in `tests/` mirroring `src/` directory structure
- Use `describe`/`it`/`expect` from vitest
- Tests may use non-null assertions and `Function` type (relaxed eslint rules for test files)
- Test generators by rendering templates and asserting on output string content
