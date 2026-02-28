import { describe, it, expect } from 'vitest'
import { generateCompose } from '../../src/generators/compose.js'
import { makeConfig } from '../helpers/make-config.js'

describe('generateCompose', () => {
  it('generates basic compose file', async () => {
    const config = makeConfig()
    const result = await generateCompose(config)

    expect(result).toContain('name: ralph-container')
    expect(result).toContain('container_name: ralph-container')
    expect(result).toContain('network_mode: host')
    expect(result).toContain('..:/workspace:cached')
    expect(result).toContain('CLAUDE_CODE_OAUTH_TOKEN')
    expect(result).not.toContain('RALPH_AGENT')
    expect(result).toContain('stdin_open: true')
    expect(result).toContain('tty: true')
  })

  it('includes shm_size when non-default', async () => {
    const config = makeConfig({
      container: { name: 'test', playwright: true },
    })
    const result = await generateCompose(config)

    expect(result).toContain("shm_size: '2gb'")
  })

  it('omits shm_size when default', async () => {
    const config = makeConfig()
    const result = await generateCompose(config)

    expect(result).not.toContain('shm_size')
  })

  it('includes capabilities', async () => {
    const config = makeConfig({
      container: { name: 'test', playwright: true },
    })
    const result = await generateCompose(config)

    expect(result).toContain('cap_add:')
    expect(result).toContain('SYS_ADMIN')
  })

  it('includes shadow volumes', async () => {
    const config = makeConfig({
      container: {
        name: 'test',
        shadowVolumes: ['/workspace/node_modules', '/workspace/packages/app/node_modules'],
      },
    })
    const result = await generateCompose(config)

    expect(result).toContain('- /workspace/node_modules')
    expect(result).toContain('- /workspace/packages/app/node_modules')
    expect(result).not.toContain('RALPH_SHADOW_VOLUMES')
  })

  it('includes persist volumes', async () => {
    const config = makeConfig()
    const result = await generateCompose(config)

    expect(result).toContain('ralph-claude-config:/home/sandbox/.claude')
    expect(result).toContain('volumes:')
    expect(result).toContain('ralph-claude-config:')
  })

  it('includes extra volumes', async () => {
    const config = makeConfig({
      container: { name: 'test', volumes: ['./data:/data:ro'] },
    })
    const result = await generateCompose(config)

    expect(result).toContain('./data:/data:ro')
  })

  it('includes project name matching container name', async () => {
    const config = makeConfig({ container: { name: 'my-project-ralph' } })
    const result = await generateCompose(config)

    expect(result).toContain('name: my-project-ralph')
  })

  it('includes extra env vars', async () => {
    const config = makeConfig({
      container: { name: 'test', env: { MY_VAR: 'hello' } },
    })
    const result = await generateCompose(config)

    expect(result).toContain('MY_VAR=hello')
  })

  it('includes host plans read-only mount', async () => {
    const config = makeConfig()
    const result = await generateCompose(config)

    expect(result).toContain('/home/sandbox/host-plans:ro')
  })

  it('includes sslCerts volume mount with relative path', async () => {
    const config = makeConfig({
      container: { name: 'test', sslCerts: '.certs' },
    })
    const result = await generateCompose(config)

    expect(result).toContain('../.certs:/tmp/ssl-certs:ro')
  })

  it('includes sslCerts volume mount with absolute path', async () => {
    const config = makeConfig({
      container: { name: 'test', sslCerts: '/home/user/certs' },
    })
    const result = await generateCompose(config)

    expect(result).toContain('/home/user/certs:/tmp/ssl-certs:ro')
  })

  it('omits sslCerts volume when not configured', async () => {
    const config = makeConfig()
    const result = await generateCompose(config)

    expect(result).not.toContain('ssl-certs')
  })

  it('resolves paths for custom user', async () => {
    const config = makeConfig({
      container: { name: 'test', user: 'node' },
    })
    const result = await generateCompose(config)

    expect(result).toContain('/home/node/host-plans:ro')
    expect(result).toContain('ralph-claude-config:/home/node/.claude')
  })
})
