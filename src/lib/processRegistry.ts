import { ChildProcess, spawn, exec } from 'child_process';
import { prisma } from './db';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RunningProcess {
  child: ChildProcess;
  logs: string[];
  command: string;
  path: string;
}

class ProcessRegistry {
  private registry: Map<string, RunningProcess> = new Map();

  async spawnProcess(projectId: string, cwd: string, fullCommand: string): Promise<number> {
    if (this.registry.has(projectId)) {
      throw new Error('Process is already running for this project');
    }

    console.log(`[ProcessRegistry] Spawning for project ${projectId} in ${cwd}: ${fullCommand}`);
    
    const isWindows = process.platform === 'win32';
    
    // Spawn child process.
    // We use shell: true to handle standard npm script lookups and execution environments.
    const child = spawn(fullCommand, {
      shell: true,
      cwd,
      detached: !isWindows, // Use detached on Unix for process group control
    });

    const pid = child.pid;
    if (!pid) {
      throw new Error('Failed to retrieve process ID');
    }

    const processEntry: RunningProcess = {
      child,
      logs: [`[System] Process spawned with PID ${pid}\n`],
      command: fullCommand,
      path: cwd,
    };

    this.registry.set(projectId, processEntry);

    // Save active state to database
    await prisma.project.update({
      where: { id: projectId },
      data: { isLocalActive: true, activePid: pid, status: 'online' },
    });

    // Pipe stdout
    child.stdout?.on('data', (data) => {
      const output = data.toString();
      this.appendLog(projectId, output);
    });

    // Pipe stderr
    child.stderr?.on('data', (data) => {
      const output = data.toString();
      this.appendLog(projectId, `[Stderr] ${output}`);
    });

    // Handle process close
    child.on('close', async (code) => {
      console.log(`[ProcessRegistry] Process for ${projectId} exited with code ${code}`);
      this.registry.delete(projectId);
      try {
        await prisma.project.update({
          where: { id: projectId },
          data: { isLocalActive: false, activePid: null, status: 'offline' },
        });
      } catch {
        // DB client might have disconnected during server shutdown
      }
    });

    child.on('error', async (err) => {
      this.appendLog(projectId, `[System Error] ${err.message}\n`);
      console.error(`[ProcessRegistry] Process error for project ${projectId}:`, err);
    });

    return pid;
  }

  async killProcess(projectId: string): Promise<void> {
    const entry = this.registry.get(projectId);
    if (!entry) {
      // Sync DB state if process is missing from memory registry
      await prisma.project.update({
        where: { id: projectId },
        data: { isLocalActive: false, activePid: null, status: 'offline' },
      });
      return;
    }

    const pid = entry.child.pid;
    if (!pid) return;

    console.log(`[ProcessRegistry] Killing process tree for project ${projectId} (PID: ${pid})`);

    try {
      if (process.platform === 'win32') {
        // Windows process tree termination
        await execAsync(`taskkill /pid ${pid} /f /t`);
      } else {
        // Unix process group termination
        try {
          process.kill(-pid, 'SIGINT');
        } catch {
          process.kill(pid, 'SIGKILL');
        }
      }
    } catch (error) {
      console.error(`[ProcessRegistry] Error executing OS kill command:`, error);
      entry.child.kill('SIGKILL'); // Direct fallback kill
    }

    this.registry.delete(projectId);
    await prisma.project.update({
      where: { id: projectId },
      data: { isLocalActive: false, activePid: null, status: 'offline' },
    });
  }

  getLogs(projectId: string): string[] {
    return this.registry.get(projectId)?.logs || [];
  }

  private appendLog(projectId: string, text: string) {
    const entry = this.registry.get(projectId);
    if (!entry) return;
    
    // Split output text by line and append
    const cleanText = text.replace(/\r/g, ''); // strip carriage returns
    const lines = cleanText.split('\n');
    
    // Remove the last element if it is empty (from the trailing newline)
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    
    entry.logs.push(...lines);
    
    // Cap buffer size at 150 lines to optimize memory
    if (entry.logs.length > 150) {
      entry.logs = entry.logs.slice(entry.logs.length - 150);
    }
  }

  killAll() {
    console.log('[ProcessRegistry] Shutting down. Terminating all spawned local projects...');
    for (const projectId of this.registry.keys()) {
      try {
        const entry = this.registry.get(projectId);
        if (entry?.child.pid) {
          const pid = entry.child.pid;
          if (process.platform === 'win32') {
            exec(`taskkill /pid ${pid} /f /t`, (err) => {
              if (err) console.error(`Exit cleanup taskkill failed for PID ${pid}`);
            });
          } else {
            process.kill(-pid, 'SIGKILL');
          }
        }
      } catch (err) {
        console.error(`Failed to kill process for project ${projectId} on exit:`, err);
      }
    }
  }
}

// Singleton pattern to support Next.js development hot-reloads
const globalForRegistry = globalThis as unknown as { processRegistry: ProcessRegistry | undefined };
export const processRegistry = globalForRegistry.processRegistry ?? new ProcessRegistry();
if (process.env.NODE_ENV !== 'production') globalForRegistry.processRegistry = processRegistry;

// Listen to node process exit triggers to clean up all active shell child processes
if (typeof process !== 'undefined') {
  process.once('SIGINT', () => {
    processRegistry.killAll();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    processRegistry.killAll();
    process.exit(0);
  });
}
