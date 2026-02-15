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
- **ejs** — Template rendering (Dockerfile, compose, entrypoint, prompt)
- **zod** — Config schema validation
- **universal-ai-config** — Programmatic API for generating AI tool configs (skills generation)

## Project Structure

- `src/config/` — Zod schema, defaults (Playwright auto-config), config loader (c12), config merge logic
- `src/commands/` — CLI subcommands (init, generate, start, stop, restart, logs, run, exec)
- `src/generators/` — File generators (Dockerfile, compose, entrypoint, prompt, skills)
- `src/templates/` — EJS templates (Dockerfile.ejs, docker-compose.yml.ejs, entrypoint.ts.ejs, ralph-prompt.md.ejs)
- `src/uac-templates/` — UAC skill templates for direct copy or EJS rendering (prd, ralph, update-fabis-ralph-loop-config)
- `src/container/` — Docker container lifecycle and exec helpers
- `src/loop/` — Ralph loop runner, progress parser, branch archive logic
- `src/utils/` — Shared utilities (template rendering, Docker helpers, gitignore management)
- `src/index.ts` — Public API exports
- `tests/` — Mirrors `src/` structure; includes `tests/helpers/` for shared test utilities

## Conventions

- Use `.js` extensions in all imports (TypeScript with ESM resolution)
- Use `node:` prefix for Node.js built-in modules (e.g. `node:fs/promises`, `node:path`)
- Use `utf8` (not `utf-8`) in encoding arguments
- Validate all external input with Zod at system boundaries; trust internal types
- Use `consola` for all user-facing logging — never raw `console.log`
- Config types: `RalphLoopConfig` = user input, `ResolvedConfig` = after Zod parse + defaults
- Zod schemas use `.prefault()` for nested object defaults initialization
- `fabis-ralph-loop.overrides.config.{ts,js,...}` — optional overrides file, gitignored, deep-merged on top of base config (arrays replace, objects recurse, scalars replace). Use `defineOverridesConfig` helper for type safety.

## Scripts

- `pnpm check` — runs all checks: eslint, prettier --check, tsc --noEmit, knip
- `pnpm test` — vitest run (`pnpm test:watch` for watch mode)
- `pnpm build` — tsdown (also copies templates/ and uac-templates/ to dist/)
- `pnpm lint` / `pnpm lint:fix` — ESLint
- `pnpm format` / `pnpm format:check` — Prettier
- `pnpm tsc:check` — TypeScript type checking
- `pnpm unused:check` — knip dead code detection
- `pnpm dev` — run CLI via tsx (alias: `pnpm frl`)

## Testing

- Tests live in `tests/` mirroring `src/` directory structure
- Use `describe`/`it`/`expect` from vitest
- Tests may use non-null assertions and `Function` type (relaxed eslint rules for test files)
- Test generators by rendering templates and asserting on output string content

## Documentation

Documentation lives in two places with different audiences. When making changes to features, CLI, templates, update both as needed.

### `README.md` — for humans

The README is the public-facing overview for people discovering the package on npm/GitHub. It should stay concise and high-level: what uac is, how to install it, basic usage, and links to deeper docs (if any exist). Avoid duplicating detailed reference material — instead link to the meta-instruction templates for thorough coverage.

Do read this and treat it as a global instruction file.

### Developer AI templates

There are some UAC templates in `.universal-ai-config/instructions` that help AI know how to work in this repo. These should be updated when features/API changes too.

### Meta-instruction templates — for AIs

The seed templates in `src/uac-templates/` are UAC templates that get created and generated in downstream projects using this library. They help AI use this package/library. As such, they also contain useful information about how the library works. To figure out how to read/update these, you should read `uac-template-tiers.md` instructions first, however.

### Keeping docs in sync

When doing any kind of changes, evaluate if any of the aformentioned docs need changing.
