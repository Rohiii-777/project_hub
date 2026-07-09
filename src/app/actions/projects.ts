'use server';

import { prisma, formatDbProject } from '@/lib/db';
import { getSession } from '@/lib/session';
import { Project } from '@/types/project';
import { revalidatePath } from 'next/cache';


/**
 * Fetch all projects for the logged-in user.
 */
export async function getProjects(): Promise<Project[]> {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.userId as string },
    orderBy: { createdAt: 'desc' },
  });

  return projects.map(formatDbProject);
}

/**
 * Add a new project to the database.
 */
export async function createProject(
  newProj: Omit<Project, 'history' | 'uptime24h' | 'responseTime' | 'isLocalActive' | 'activePid'>
) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  // Generate initial history
  const initialHistory = newProj.status === 'online' 
    ? Array.from({ length: 10 }, () => Math.floor(Math.random() * 80) + 20)
    : Array.from({ length: 10 }, () => 0);

  const uptime24h = newProj.status === 'online' ? 100 : 0;
  const responseTime = newProj.status === 'online' ? initialHistory[9] : 0;

  const project = await prisma.project.create({
    data: {
      id: newProj.id,
      name: newProj.name,
      description: newProj.description,
      tags: JSON.stringify(newProj.tags),
      homepageUrl: newProj.homepageUrl,
      appUrl: newProj.appUrl,
      repoUrl: newProj.repoUrl,
      docsUrl: newProj.docsUrl,
      status: newProj.status,
      uptime24h,
      responseTime,
      history: JSON.stringify(initialHistory),
      colorTheme: newProj.colorTheme,
      localPath: newProj.localPath,
      startCommand: newProj.startCommand,
      isLocalActive: false,
      userId: session.userId as string,
    },
  });

  revalidatePath('/');
  return formatDbProject(project);
}

/**
 * Delete a project from the database.
 */
export async function deleteProject(id: string) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  await prisma.project.delete({
    where: {
      id,
      userId: session.userId as string,
    },
  });

  revalidatePath('/');
  return { success: true };
}

/**
 * Update project details (like config properties or local commands).
 */
export async function updateProject(id: string, updates: Partial<Project>) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  // Format incoming objects to database strings
  const data = { ...updates } as Record<string, unknown>;
  if (updates.tags) data.tags = JSON.stringify(updates.tags);
  if (updates.history) data.history = JSON.stringify(updates.history);

  // Strip keys that are relations or shouldn't be edited directly here
  delete data.id;
  delete data.userId;

  const project = await prisma.project.update({
    where: {
      id,
      userId: session.userId as string,
    },
    data,
  });

  revalidatePath('/');
  return formatDbProject(project);
}

/**
 * Bulk save the scanned status and latency metrics for active projects.
 */
export async function updateScannedStatus(
  updates: Array<{
    id: string;
    status: Project['status'];
    responseTime: number;
    history: number[];
    uptime24h: number;
  }>
) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  // Bulk update transactions in SQLite
  await prisma.$transaction(
    updates.map((up) =>
      prisma.project.update({
        where: {
          id: up.id,
          userId: session.userId as string,
        },
        data: {
          status: up.status,
          responseTime: up.responseTime,
          history: JSON.stringify(up.history),
          uptime24h: up.uptime24h,
        },
      })
    )
  );

  revalidatePath('/');
  return { success: true };
}
