import { execa } from 'execa'

export async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['inspect', '-f', '{{.State.Running}}', containerName])
    return stdout.trim() === 'true'
  } catch {
    return false
  }
}
