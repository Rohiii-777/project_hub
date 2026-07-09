'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { encryptToken, decryptToken } from '@/lib/crypto';

export type GithubRepo = {
  id: number;
  name: string;
  description: string | null;
  homepageUrl: string | null;
  repoUrl: string;
  language: string | null;
  tags: string[];
  isImported: boolean;
};

/**
 * Save user's GitHub username and PAT (Personal Access Token) credentials.
 */
export async function saveGithubCredentials(username: string, token: string) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  const encryptedToken = encryptToken(token.trim());

  await prisma.user.update({
    where: { id: session.userId as string },
    data: {
      githubUsername: username.trim(),
      githubToken: encryptedToken,
    },
  });

  return { success: true };
}

/**
 * Fetch GitHub credentials stored in the user profile.
 */
export async function getGithubCredentials() {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { githubUsername: true, githubToken: true },
  });

  return {
    username: user?.githubUsername || '',
    hasToken: !!user?.githubToken,
  };
}

/**
 * Retrieve repositories for the authenticated user from the GitHub API.
 */
export async function fetchGithubRepos(): Promise<{ repos?: GithubRepo[]; error?: string }> {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId as string },
      select: { githubUsername: true, githubToken: true, projects: true },
    });

    if (!user?.githubUsername || !user?.githubToken) {
      return { error: 'GitHub credentials not configured. Please set them in your settings.' };
    }

    const decryptedToken = decryptToken(user.githubToken);

    // Call GitHub API to list repos
    // We request both public and private owner repos
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner', {
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Project-Hub-App/1.0',
      },
      next: { revalidate: 0 }, // bypass next fetch cache
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error status:', response.status, errorText);
      return { error: `Failed to fetch from GitHub: ${response.statusText}` };
    }

    const reposData = await response.json();
    if (!Array.isArray(reposData)) {
      return { error: 'Invalid response from GitHub API.' };
    }

    const importedIds = new Set(
      user.projects
        .filter((p: { isGithubRepo: boolean; githubRepoId: number | null }) => p.isGithubRepo && p.githubRepoId)
        .map((p: { isGithubRepo: boolean; githubRepoId: number | null }) => p.githubRepoId)
    );

    // Format repos
    const repos: GithubRepo[] = reposData.map((repo: {
      id: number;
      name: string;
      description: string | null;
      homepage: string | null;
      html_url: string;
      language: string | null;
      topics?: string[];
    }) => {
      const tags = [];
      if (repo.language) tags.push(repo.language);
      if (repo.topics && Array.isArray(repo.topics)) {
        tags.push(...repo.topics.slice(0, 4));
      }

      return {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        homepageUrl: repo.homepage || null,
        repoUrl: repo.html_url,
        language: repo.language || null,
        tags,
        isImported: importedIds.has(repo.id),
      };
    });

    return { repos };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('GitHub fetch error:', error);
    return { error: msg || 'An unexpected error occurred while syncing repositories.' };
  }
}

/**
 * Import a GitHub repository as a Project portal.
 */
export async function importGithubRepo(repo: GithubRepo) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  try {
    const isAlreadyImported = await prisma.project.findFirst({
      where: {
        userId: session.userId as string,
        githubRepoId: repo.id,
      },
    });

    if (isAlreadyImported) {
      return { success: false, error: 'Repository is already imported.' };
    }

    // Determine a clean theme color
    const themes: Array<'violet' | 'emerald' | 'amber' | 'blue' | 'rose' | 'cyan'> = [
      'violet',
      'emerald',
      'amber',
      'blue',
      'rose',
      'cyan',
    ];
    const colorTheme = themes[Math.floor(Math.random() * themes.length)];

    // Create a new Project linked to the user
    await prisma.project.create({
      data: {
        id: `gh-${repo.id}`,
        name: repo.name,
        description: repo.description || 'Imported from GitHub.',
        tags: JSON.stringify(repo.tags),
        homepageUrl: repo.homepageUrl || undefined,
        repoUrl: repo.repoUrl,
        status: repo.homepageUrl ? 'offline' : 'online',
        history: JSON.stringify(Array.from({ length: 10 }, () => 0)),
        colorTheme,
        isGithubRepo: true,
        githubRepoId: repo.id,
        userId: session.userId as string,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('GitHub import error:', error);
    return { success: false, error: msg || 'Failed to import repository.' };
  }
}
