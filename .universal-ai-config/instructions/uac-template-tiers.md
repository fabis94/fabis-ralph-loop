---
description: When to update repo UAC templates vs shipped UAC templates bundled for consumers
alwaysApply: true
---

# Two-Tier UAC Template System

This project has **two separate sets of UAC templates** that serve different purposes. Always identify which tier a change belongs to before editing.

## Repo Templates (`.universal-ai-config/`)

These are the UAC templates for **this project itself** (fabis-ralph-loop). They configure how AI tools behave when working on this codebase.

**Contents:** Project conventions, development guidelines, skills for managing the repo (e.g., `/update-ai-config`, `/update-instruction`), hooks, MCP configs.

**When to update:**

- Changing how AI assistants work **within this repo**
- Adding/editing coding conventions, project structure docs, or development rules
- Creating skills or agents for maintaining fabis-ralph-loop itself
- Modifying hooks that run during development of this package

**Generated output:** `pnpm uac generate` renders these into `.claude/`, `.github/`, `.cursor/` etc. for this repo.

## Shipped Templates (`src/uac-templates/`)

These are UAC templates **bundled with the package** and delivered to consumers. When someone installs fabis-ralph-loop and runs `ralph-loop generate`, these templates are copied into their project.

**Contents:** Skills and templates that consumers need for the Ralph workflow (e.g., `/prd` for PRD generation, `/ralph` for PRD-to-JSON conversion).

**When to update:**

- Changing workflows that **consumers of this package** will use
- Adding/editing skills that run inside the Ralph autonomous coding loop
- Modifying PRD generation, Ralph JSON conversion, or other user-facing workflows
- Adding new skills or templates that consumer projects should inherit

**How they work:**

- In **UAC mode**: copied as-is into the consumer's UAC templates directory, then rendered by their `uac generate`
- In **direct mode**: rendered with EJS using the consumer's project config and written directly to `.claude/skills/`

**EJS variables available:** `backpressureCommands`, `projectName`, `projectContext`, `openAppSkill`, `playwright` (injected from the consumer's `fabis-ralph-loop.config.ts`)

## Decision Checklist

Ask: **Who benefits from this change?**

| Question                  | Repo (`.universal-ai-config/`)         | Shipped (`src/uac-templates/`)                    |
| ------------------------- | -------------------------------------- | ------------------------------------------------- |
| Who uses it?              | Developers working on fabis-ralph-loop | Consumers who install this package                |
| Where does it run?        | In this repo                           | In consumer projects                              |
| What triggers generation? | `pnpm uac generate`                    | `ralph-loop generate`                             |
| Can it use EJS?           | Yes (`target`, `config`, path helpers) | Yes (`backpressureCommands`, `projectName`, etc.) |
| File structure            | Standard UAC layout                    | Mirrors UAC layout (currently `skills/` only)     |

## Examples

- "Add a rule about how we write tests in this repo" → **Repo** (`.universal-ai-config/instructions/`)
- "Update the PRD skill that users get when they install the package" → **Shipped** (`src/uac-templates/skills/prd/`)
- "Create a skill for managing our Docker templates" → **Repo** (`.universal-ai-config/skills/`)
- "Add a new skill for consumers to run database migrations" → **Shipped** (`src/uac-templates/skills/`)
- "Change the project conventions docs" → **Repo** (`.universal-ai-config/instructions/general.md`)
