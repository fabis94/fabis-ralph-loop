import { z } from 'zod'

const backpressureCommandSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
})

const containerHooksSchema = z.object({
  rootSetup: z.array(z.string()).default([]),
  userSetup: z.array(z.string()).default([]),
})

const containerSchema = z.object({
  name: z.string().min(1),
  baseImage: z.string().min(1).default('node:22-bookworm'),
  systemPackages: z.array(z.string()).default([]),
  playwright: z.boolean().default(false),
  networkMode: z.string().default('host'),
  env: z.record(z.string()).default({}),
  shmSize: z.string().default('64m'),
  capabilities: z.array(z.string()).default([]),
  volumes: z.array(z.string()).default([]),
  shadowVolumes: z.array(z.string()).default([]),
  persistVolumes: z.record(z.string()).default({ 'ralph-claude-config': '/home/node/.claude' }),
  hooks: containerHooksSchema.default({}),
})

const setupSchema = z.object({
  preStartCommand: z.string().default(''),
})

const defaultsSchema = z.object({
  agent: z.literal('claude').default('claude'),
  model: z.string().default('sonnet'),
  verbose: z.boolean().default(false),
  sleepBetweenMs: z.number().int().min(0).default(2000),
  completionSignal: z.string().default('RALPH_WORK_FULLY_DONE'),
})

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  context: z.string().default(''),
  backpressureCommands: z.array(backpressureCommandSchema).default([]),
  openAppSkill: z.string().default(''),
})

const outputSchema = z.object({
  mode: z.enum(['direct', 'uac']).default('direct'),
  uacTemplatesDir: z.string().default('.universal-ai-config'),
})

export const ralphLoopConfigSchema = z.object({
  container: containerSchema.default({ name: 'ralph-container' }),
  setup: setupSchema.default({}),
  defaults: defaultsSchema.default({}),
  project: projectSchema,
  output: outputSchema.default({}),
})

export type RalphLoopConfig = z.input<typeof ralphLoopConfigSchema>
export type ResolvedConfig = z.output<typeof ralphLoopConfigSchema>
export type BackpressureCommand = z.infer<typeof backpressureCommandSchema>
