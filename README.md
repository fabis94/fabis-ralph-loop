# fabis-ralph-loop

CLI for setting up and running Claude Ralph autonomous coding loops in Docker containers.

Define a `fabis-ralph-loop.config.ts`, then use the CLI to generate Docker artifacts, manage the container lifecycle, and run iterative autonomous coding loops. Each iteration, a Claude agent picks the next user story from a PRD, implements it, runs quality checks, commits, and stops — then a fresh session picks up the next one.

## Install

```bash
pnpm add fabis-ralph-loop
```

Requires Node.js >= 22.

## Quick Start

```bash
# 1. Scaffold config file and generate all files
npx fabis-ralph-loop init

# 2. Edit fabis-ralph-loop.config.ts to match your project

# 3. Regenerate files after config changes
npx fabis-ralph-loop generate

# 4. Start the container (auto-attaches a shell)
npx fabis-ralph-loop start
```

Before starting the container, prepare a PRD using the generated skills in your IDE:

```
/prd                    # describe your feature → .ralph/prd-feature.md
/ralph                  # convert PRD to JSON → .ralph/prd.json
```

Then inside the container, kick off the loop:

```bash
# Run 20 iterations of the autonomous coding loop
run-fabis-ralph-loop 20

# Override the model
run-fabis-ralph-loop 20 --model opus

# Enable verbose progress output
run-fabis-ralph-loop 20 --verbose
```

`run-fabis-ralph-loop` is a wrapper script installed in the container's PATH that pins the same CLI version as the host. Ctrl+C gracefully stops the current iteration; pressing it twice force-exits.

## How It Works

1. **Generate** — `fabis-ralph-loop generate` creates Docker artifacts (`.ralph-container/`), a prompt template (`ralph-prompt.md`), and AI skills
2. **Prepare a PRD** — Use `/prd` in your IDE to write a Product Requirements Document, then `/ralph` to convert it into `.ralph/prd.json`
3. **Start** — `fabis-ralph-loop start` builds the container image, starts it, runs the entrypoint (git safety, auth validation, direnv, setup hooks), then drops you into a shell
4. **Run the loop** — `run-fabis-ralph-loop <iterations>` feeds the prompt to the Claude agent each iteration. The agent reads the PRD, picks the highest-priority incomplete story, implements it, runs backpressure commands (lint, typecheck, tests), commits, and stops. The next iteration picks up the next story.
5. **Completion** — When all stories pass, the agent outputs a completion signal and the loop exits early

The container is sandboxed: git pushes are blocked, and each iteration runs in a fresh agent session so context doesn't leak between stories.

## Configuration

Create a `fabis-ralph-loop.config.ts` in your project root:

```ts
import { defineConfig } from 'fabis-ralph-loop'

export default defineConfig({
  project: {
    name: 'my-project',
    description: 'What the project does',
    context: 'Additional context for the AI agent',
    backpressureCommands: [
      { name: 'typecheck', command: 'pnpm tsc --noEmit' },
      { name: 'lint', command: 'pnpm eslint .' },
    ],
  },
  container: {
    name: 'my-project-ralph',
    playwright: true, // auto-configures Playwright MCP + headless Chromium
    systemPackages: ['ripgrep'],
    env: { NODE_ENV: 'development' },
    hooks: {
      rootSetup: ['apt-get install -y some-package'],
      userSetup: ['npm install -g some-tool'],
      entrypointSetup: ['pnpm install'],
    },
  },
  defaults: {
    model: 'sonnet',
    sleepBetweenMs: 2000,
  },
  output: {
    mode: 'direct', // or 'uac' for universal-ai-config integration
  },
})
```

### Overrides Config

For environment-specific settings that shouldn't be committed (different models, debug flags, local API keys), create a `fabis-ralph-loop.overrides.config.ts`:

```ts
import { defineOverridesConfig } from 'fabis-ralph-loop'

export default defineOverridesConfig({
  defaults: {
    model: 'opus',
    verbose: true,
  },
  container: {
    env: { DEBUG: 'true' },
  },
})
```

The overrides file is **gitignored automatically** by `fabis-ralph-loop init`. It gets deep-merged on top of the base config: objects merge recursively, arrays are replaced entirely, and scalars are overwritten.

## CLI Commands

All commands run on the **host machine** via `npx fabis-ralph-loop <command>`:

| Command    | Description                                               |
| ---------- | --------------------------------------------------------- |
| `init`     | Scaffold config and generate all files                    |
| `generate` | Regenerate files from config                              |
| `start`    | Build and start the container (attaches shell by default) |
| `stop`     | Stop and remove the container                             |
| `restart`  | Stop + start the container                                |
| `logs`     | Follow container logs                                     |
| `run <n>`  | Execute _n_ loop iterations (can also run from host)      |
| `exec`     | Run an arbitrary command inside the container             |

### Notable flags

- `generate --dry-run` — preview without writing files
- `generate --only <container|prompt|skills>` — generate a specific subset
- `start --no-attach` / `restart --no-attach` — don't attach a shell after starting
- `run --model <model>` — override the default model
- `run --verbose` — enable verbose progress output

### Inside the container

The container has `run-fabis-ralph-loop` on the PATH — this is the primary way to kick off loop iterations. It wraps `fabis-ralph-loop run` pinned to the same version as your host install.

## Generated Skills

`fabis-ralph-loop generate` seeds AI skills into your project that power the Ralph workflow. These are slash commands available to the Claude agent both inside the container and in your IDE:

- **`/prd`** — Generate a Product Requirements Document. Describe a feature, answer a few clarifying questions, and get a structured PRD saved to `.ralph/prd-<feature>.md`.
- **`/ralph`** — Convert a PRD into `.ralph/prd.json`, the structured format the loop consumes. Splits stories into iteration-sized chunks, orders by dependencies, and ensures each has verifiable acceptance criteria.
- **`/update-fabis-ralph-loop-config`** — Edit `fabis-ralph-loop.config.ts` without manually reading the schema. Useful for adding backpressure commands, container packages, env vars, or hooks.

### Typical workflow

```
# In your IDE (before starting the container):
/prd                    # describe your feature, answer questions → .ralph/prd-feature.md
/ralph                  # convert PRD to JSON → .ralph/prd.json

# Inside the container:
run-fabis-ralph-loop 20 # let the loop implement it
```

## What Gets Generated

Running `generate` creates:

- **`.ralph-container/Dockerfile`** — container image with system packages, user setup, and optional Playwright
- **`.ralph-container/docker-compose.yml`** — compose config with volumes, networking, and environment
- **`.ralph-container/entrypoint.ts`** — container entrypoint that bootstraps the environment
- **`ralph-prompt.md`** — the prompt fed to the AI agent each iteration
- **Skills** — AI tool skills for PRD creation and Ralph workflow (output location depends on `output.mode`)

## Programmatic API

```ts
import { loadRalphConfig, generateAll, defineConfig } from 'fabis-ralph-loop'
import type { RalphLoopConfig, ResolvedConfig } from 'fabis-ralph-loop'

const { config, projectRoot } = await loadRalphConfig()
await generateAll(config, projectRoot)
```

## License

MIT
