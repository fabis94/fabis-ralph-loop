#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'fabis-ralph-loop',
    description: 'CLI for setting up and running Claude Ralph autonomous coding loops',
    version: '0.1.0',
  },
  subCommands: {
    init: () => import('./commands/init.js').then((m) => m.default),
    generate: () => import('./commands/generate.js').then((m) => m.default),
    start: () => import('./commands/start.js').then((m) => m.default),
    stop: () => import('./commands/stop.js').then((m) => m.default),
    restart: () => import('./commands/restart.js').then((m) => m.default),
    logs: () => import('./commands/logs.js').then((m) => m.default),
    run: () => import('./commands/run.js').then((m) => m.default),
    exec: () => import('./commands/exec.js').then((m) => m.default),
  },
})

runMain(main)
