import React from 'react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { formatDbProject } from '@/lib/db';
import DashboardClient from '@/components/DashboardClient';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // 1. Authenticate user
  const session = await getSession();
  if (!session?.userId) {
    redirect('/login');
  }

  // 2. Fetch projects and user info
  const [projectsData, userData] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session.userId as string },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: session.userId as string },
      select: { username: true },
    }),
  ]);

  // 3. Convert DB schemas to frontend Types
  const initialProjects = projectsData.map(formatDbProject);

  return (
    <main className="min-h-screen flex flex-col bg-[#07080e] text-[#f8fafc]">
      <DashboardClient 
        initialProjects={initialProjects} 
        username={userData?.username || 'Developer'} 
      />
    </main>
  );
}

// Ensure the page always fetches fresh dynamic data from SQLite database
export const dynamic = 'force-dynamic';
export const revalidate = 0;
