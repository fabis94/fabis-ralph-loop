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

**How they work — Two-Level EJS:**

Shipped templates support two levels of EJS that are processed at different times:

| Level       | Syntax in source     | Processed by                                            | Variables                                                                                            |
| ----------- | -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Level 1** | `<%% %>` `<%%= %>`   | `ralph-loop generate`                                   | `backpressureCommands`, `projectName`, `projectContext`, `openAppSkill`, `playwright`, full `config` |
| **Level 2** | `<%%% %>` `<%%%= %>` | `uac generate` (or UAC programmatic API in direct mode) | `target`, path helpers, UAC config variables                                                         |

EJS's `<%%%` escape syntax outputs a literal `<%%` after Level 1 rendering — this is how Level 2 survives the first pass.

**UAC mode flow:**

1. `ralph-loop generate` → renders Level 1 EJS → writes to `.universal-ai-config/skills/` (Level 2 `<%%% %>` becomes `<%% %>`)
2. Consumer runs `uac generate` → renders Level 2 EJS + frontmatter mapping → writes to `.claude/skills/`

**Direct mode flow:**

1. `ralph-loop generate` → renders Level 1 EJS → writes to a temp dir as UAC-format templates
2. Calls UAC's programmatic `generate()` API on the temp dir → handles Level 2 EJS + frontmatter mapping
3. Calls `writeGeneratedFiles()` → writes to `.claude/skills/`
4. Cleans up temp dir

**Level 1 variables available:** `backpressureCommands`, `projectName`, `projectContext`, `openAppSkill`, `playwright`, `config` (full `ResolvedConfig` object)

## Decision Checklist

Ask: **Who benefits from this change?**

| Question                  | Repo (`.universal-ai-config/`)         | Shipped (`src/uac-templates/`)                                               |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| Who uses it?              | Developers working on fabis-ralph-loop | Consumers who install this package                                           |
| Where does it run?        | In this repo                           | In consumer projects                                                         |
| What triggers generation? | `pnpm uac generate`                    | `ralph-loop generate`                                                        |
| Can it use EJS?           | Yes (`target`, `config`, path helpers) | Yes — Level 1: `<%% %>` for ralph-loop vars; Level 2: `<%%% %>` for UAC vars |
| File structure            | Standard UAC layout                    | Mirrors UAC layout (currently `skills/` only)                                |

## Examples

- "Add a rule about how we write tests in this repo" → **Repo** (`.universal-ai-config/instructions/`)
- "Update the PRD skill that users get when they install the package" → **Shipped** (`src/uac-templates/skills/prd/`)
- "Create a skill for managing our Docker templates" → **Repo** (`.universal-ai-config/skills/`)
- "Add a new skill for consumers to run database migrations" → **Shipped** (`src/uac-templates/skills/`)
- "Change the project conventions docs" → **Repo** (`.universal-ai-config/instructions/general.md`)
