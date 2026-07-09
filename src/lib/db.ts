import { PrismaClient } from '@/generated/client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { Project } from '@/types/project';

// Calculate the absolute path to the SQLite database file
const dbPath = path.resolve(process.cwd(), 'prisma/dev.db');

const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Helper to convert database project schemas to frontend Project types.
 */
export function formatDbProject(p: {
  id: string;
  name: string;
  description: string | null;
  tags: string;
  homepageUrl: string | null;
  appUrl: string | null;
  repoUrl: string | null;
  docsUrl: string | null;
  status: string;
  uptime24h: number;
  responseTime: number;
  history: string;
  colorTheme: string;
  localPath: string | null;
  startCommand: string | null;
  isLocalActive: boolean;
  activePid: number | null;
  isGithubRepo: boolean;
  githubRepoId: number | null;
}): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    tags: JSON.parse(p.tags),
    homepageUrl: p.homepageUrl || undefined,
    appUrl: p.appUrl || undefined,
    repoUrl: p.repoUrl || undefined,
    docsUrl: p.docsUrl || undefined,
    status: p.status as Project['status'],
    uptime24h: p.uptime24h,
    responseTime: p.responseTime,
    history: JSON.parse(p.history),
    colorTheme: p.colorTheme as Project['colorTheme'],
    localPath: p.localPath || undefined,
    startCommand: p.startCommand || undefined,
    isLocalActive: p.isLocalActive,
    activePid: p.activePid || undefined,
    isGithubRepo: p.isGithubRepo,
    githubRepoId: p.githubRepoId || undefined,
  };
}
