import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';
import { prisma } from '@/lib/db';
import { processRegistry } from '@/lib/processRegistry';

/**
 * GET handler to retrieve logs for a running local process.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authenticate request
  const cookie = req.cookies.get('session')?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const logs = processRegistry.getLogs(id);
    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: msg || 'Failed to fetch logs' }, { status: 500 });
  }
}

/**
 * POST handler to start or stop a local project process.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authenticate request
  const cookie = req.cookies.get('session')?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 2. Parse request action
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action !== 'start' && action !== 'stop') {
    return NextResponse.json({ error: 'Invalid action. Must be "start" or "stop"' }, { status: 400 });
  }

  try {
    // 3. Fetch project configurations
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'start') {
      if (!project.localPath || !project.startCommand) {
        return NextResponse.json(
          { error: 'Local path and start command must be configured to launch locally.' },
          { status: 400 }
        );
      }

      const pid = await processRegistry.spawnProcess(project.id, project.localPath, project.startCommand);
      return NextResponse.json({ message: 'Process started successfully', pid });
    } else {
      await processRegistry.killProcess(project.id);
      return NextResponse.json({ message: 'Process stopped successfully' });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error executing process action ${action}:`, error);
    return NextResponse.json({ error: msg || 'Failed to manage process' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
