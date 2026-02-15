---
name: 'update-fabis-ralph-loop-config'
description: "Update the fabis-ralph-loop.config.ts configuration file. Use when adding
  backpressure commands, changing container settings, updating project metadata, or
  modifying any Ralph loop config. Triggers on: update ralph config, add backpressure
  command, change container settings, modify ralph-loop config.\n"
---

# Ralph Loop Config Editor

Update `fabis-ralph-loop.config.ts` — the central configuration file for the Ralph autonomous coding loop.

---

## The Job

1. Read the current `fabis-ralph-loop.config.ts`
2. Understand what the user wants to change
3. Apply the change, preserving existing values
4. Validate the result makes sense (types, required fields)

**Important:** Always read the file first. Never overwrite unrelated config sections.

---

## Config File Location

The config file is always at the project root: `fabis-ralph-loop.config.ts`

It exports a default object with the `defineConfig` helper:

```typescript
import { defineConfig } from 'fabis-ralph-loop'

export default defineConfig({
  // config here
})
```

---

## Complete Config Reference

### `project` (REQUIRED)

The only required top-level key. Defines project identity and quality checks.

| Key                    | Type                    | Default      | Purpose                                                                                                       |
| ---------------------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `name`                 | `string`                | **required** | Project name — shown in agent prompts and used as identifier                                                  |
| `description`          | `string`                | `''`         | One-line project description shown in Ralph agent instructions                                                |
| `context`              | `string`                | `''`         | Extended project context (tech stack, monorepo structure, conventions). Included verbatim in the Ralph prompt |
| `backpressureCommands` | `BackpressureCommand[]` | `[]`         | Quality check commands Ralph runs after each story (see below)                                                |
| `openAppSkill`         | `string`                | `''`         | Path to a skill file for opening the app in a browser (used for visual verification)                          |

#### Backpressure Commands

These are the quality gates Ralph runs after completing each user story. If any fail, Ralph retries the story. Each entry has:

- `name` — human-readable label (e.g., `"Typecheck"`, `"Lint"`, `"Unit tests"`)
- `command` — shell command to run (e.g., `"pnpm tsc --noEmit"`, `"pnpm test"`)

**When to update:** Add commands for every quality check the project uses. Order matters — put fast checks first (typecheck, lint) and slow checks last (e2e tests).

```typescript
backpressureCommands: [
  { name: 'Typecheck', command: 'pnpm tsc --noEmit' },
  { name: 'Lint', command: 'pnpm eslint .' },
  { name: 'Unit tests', command: 'pnpm vitest run' },
  { name: 'Build', command: 'pnpm build' },
]
```

**Monorepo example** (scoped commands):

```typescript
backpressureCommands: [
  { name: 'Typecheck shared', command: 'pnpm --filter @app/shared tsc --noEmit' },
  { name: 'Typecheck web', command: 'pnpm --filter @app/web tsc --noEmit' },
  { name: 'Test shared', command: 'pnpm --filter @app/shared test' },
  { name: 'Build shared', command: 'pnpm --filter @app/shared build' },
]
```

---

### `container`

Docker container configuration. Controls the environment Ralph runs in.

| Key              | Type                     | Default                                              | Purpose                                                                                                |
| ---------------- | ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `name`           | `string`                 | `'ralph-container'`                                  | Docker container name. Change if running multiple Ralph instances                                      |
| `baseImage`      | `string`                 | `'node:22-bookworm'`                                 | Base Docker image. Use a different Node version or distro if needed                                    |
| `user`           | `string`                 | `'sandbox'`                                          | Container user. Default creates `sandbox` (UID 1000). Set to existing user (e.g. `'node'`) to reuse it |
| `systemPackages` | `string[]`               | `[]`                                                 | APT packages to install (e.g., `['postgresql-client', 'redis-tools']`)                                 |
| `playwright`     | `boolean`                | `false`                                              | Enable Playwright browser testing. Auto-adds `SYS_ADMIN` capability and sets `shmSize` to `'2gb'`      |
| `networkMode`    | `string`                 | `'host'`                                             | Docker network mode. Use `'bridge'` if host networking causes conflicts                                |
| `env`            | `Record<string, string>` | `{}`                                                 | Environment variables injected into the container                                                      |
| `shmSize`        | `string`                 | `'64m'`                                              | Shared memory size. Auto-upgraded to `'2gb'` when `playwright: true`                                   |
| `capabilities`   | `string[]`               | `[]`                                                 | Docker capabilities (e.g., `['SYS_ADMIN']`). Auto-added when `playwright: true`                        |
| `volumes`        | `string[]`               | `[]`                                                 | Additional Docker volume mounts (standard Docker `-v` syntax)                                          |
| `shadowVolumes`  | `string[]`               | `[]`                                                 | Paths to exclude from the project mount using anonymous volumes (see below)                            |
| `persistVolumes` | `Record<string, string>` | `{ 'ralph-claude-config': '/home/sandbox/.claude' }` | Named volumes that persist across container restarts. Key = volume name, value = container path        |
| `hooks`          | `ContainerHooks`         | `{}`                                                 | Dockerfile build hooks (see below)                                                                     |

#### Shadow Volumes

Shadow volumes mount anonymous volumes over specific paths inside the container, preventing the host's files at those paths from leaking in. The container installs its own dependencies fresh instead of using the host's.

The most common use case is `node_modules` — you want the container to run its own `npm install` rather than using the host's potentially platform-incompatible `node_modules`.

**Important for monorepos:** You must shadow-mount `node_modules` in **every** package that has one, not just the root. If you only shadow the root `node_modules`, nested packages will still leak the host's `node_modules` into the container.

```typescript
// Single-package project
container: {
  shadowVolumes: ['/workspace/node_modules'],
}

// Monorepo — shadow ALL node_modules directories
container: {
  shadowVolumes: [
    '/workspace/node_modules',
    '/workspace/apps/web/node_modules',
    '/workspace/apps/api/node_modules',
    '/workspace/packages/shared/node_modules',
    '/workspace/packages/ui/node_modules',
  ],
}
```

**Tip:** Check your monorepo for every directory that contains a `node_modules/` folder and add a shadow volume for each one. Missing even one can cause hard-to-debug platform mismatch errors inside the container.

#### Container Hooks

Insert custom Dockerfile instructions. Each string is written verbatim into the Dockerfile — you must include the `RUN` (or other Dockerfile instruction) prefix yourself.

- `rootSetup` — `string[]` of Dockerfile instructions executed as **root** (after system packages, before user switch)
- `userSetup` — `string[]` of Dockerfile instructions executed as the **sandbox** user (after workdir setup)
- `entrypointSetup` — `string[]` of shell commands executed at **container startup** (after volumes mount and direnv, before ready signal). Use for commands that depend on mounted volumes (e.g., `pnpm install`, database migrations). These are raw shell commands — no `RUN` prefix.

```typescript
container: {
  hooks: {
    rootSetup: [
      'RUN curl -fsSL https://example.com/install.sh | bash',
    ],
    userSetup: [
      'RUN corepack enable',
      'RUN corepack prepare pnpm@latest --activate',
    ],
    entrypointSetup: [
      'pnpm install --frozen-lockfile',
      'pnpm db:migrate',
    ],
  },
}
```

**When to update `container`:**

- The project needs system-level dependencies → `systemPackages`
- The project uses Playwright or browser-based tests → `playwright: true`
- Need API keys or secrets in the container → `env` (prefer secrets management over hardcoding)
- Running multiple Ralph instances side-by-side → change `name`
- Need to persist additional directories across runs → `persistVolumes`
- Need to isolate directories like `node_modules` from host → `shadowVolumes`
- Need custom build steps in the Docker image → `hooks`

---

### `setup`

Pre-container-start configuration.

| Key               | Type     | Default | Purpose                                                  |
| ----------------- | -------- | ------- | -------------------------------------------------------- |
| `preStartCommand` | `string` | `''`    | Shell command to run before starting the Ralph container |

**When to update:** Use when the project needs infrastructure running before Ralph starts (e.g., starting a database, running docker-compose for dependencies).

```typescript
setup: {
  preStartCommand: 'docker compose -f docker-compose.deps.yml up -d',
}
```

---

### `defaults`

Ralph loop execution defaults. These can be overridden per-run via CLI flags.

| Key                | Type       | Default                   | Purpose                                                                 |
| ------------------ | ---------- | ------------------------- | ----------------------------------------------------------------------- |
| `agent`            | `'claude'` | `'claude'`                | AI agent to use (currently only `'claude'` is supported)                |
| `model`            | `string`   | `'sonnet'`                | Claude model for the Ralph loop (e.g., `'sonnet'`, `'opus'`)            |
| `verbose`          | `boolean`  | `false`                   | Enable verbose logging output                                           |
| `sleepBetweenMs`   | `number`   | `2000`                    | Milliseconds to pause between Ralph iterations (prevents rate limiting) |
| `completionSignal` | `string`   | `'RALPH_WORK_FULLY_DONE'` | The exact string the agent outputs when all work is complete            |

**When to update:**

- Want to use a more capable model → `model: 'opus'`
- Getting rate-limited → increase `sleepBetweenMs`
- Debugging loop behavior → `verbose: true`
- Custom completion detection → change `completionSignal` (rare)

---

### `output`

Controls how Ralph generates skill files for the AI agent.

| Key               | Type                  | Default                  | Purpose                                                                                                                               |
| ----------------- | --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`            | `'direct'` \| `'uac'` | `'direct'`               | `'direct'` renders skills straight to `.claude/skills/`. `'uac'` copies templates into the UAC directory for `uac generate` to handle |
| `uacTemplatesDir` | `string`              | `'.universal-ai-config'` | Path to the UAC templates directory (only used when `mode: 'uac'`)                                                                    |

**When to update:**

- Project already uses universal-ai-config → `mode: 'uac'`
- UAC templates are in a non-standard location → set `uacTemplatesDir`

---

## Common Tasks

### Adding a new backpressure command

Read the config, add an entry to the `backpressureCommands` array:

```typescript
backpressureCommands: [
  // ... existing commands
  { name: 'New check', command: 'pnpm new-check' },
]
```

### Enabling Playwright for visual testing

```typescript
container: {
  playwright: true,
}
```

This automatically handles `SYS_ADMIN` capability and shared memory — no need to set those manually.

### Adding environment variables

```typescript
container: {
  env: {
    DATABASE_URL: 'postgresql://localhost:5432/mydb',
    NODE_ENV: 'development',
  },
}
```

### Persisting a cache directory

```typescript
container: {
  persistVolumes: {
    'ralph-claude-config': '/home/sandbox/.claude',
    'ralph-turbo-cache': '/home/sandbox/.cache/turbo',
  },
}
```

---

## Workflow: Running the Ralph Loop

The Ralph loop runs **inside the container**, not via `docker exec` from the host:

```bash
# On host:
fabis-ralph-loop generate        # generates Dockerfile with wrapper script
fabis-ralph-loop start           # builds, starts, auto-attaches to container shell

# Now inside container:
run-fabis-ralph-loop 20 --model opus --verbose   # runs the loop
# Ctrl+C stops the loop cleanly
# Ctrl+D / exit to leave container shell
```

- `fabis-ralph-loop start` auto-attaches to the container shell by default. Use `--no-attach` to skip.
- `run-fabis-ralph-loop` is a wrapper script baked into the Dockerfile that invokes `npx fabis-ralph-loop run` at the same version as the host CLI.
- Ctrl+C works naturally because the process runs directly inside the container's PID namespace.

---

## Checklist

Before saving config changes:

- [ ] Read the existing `fabis-ralph-loop.config.ts` first
- [ ] Preserved all unrelated config sections
- [ ] Required field `project.name` is still present
- [ ] Backpressure commands have both `name` and `command`
- [ ] No duplicate backpressure command names
- [ ] Used `defineConfig` wrapper for type safety
