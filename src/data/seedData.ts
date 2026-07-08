import { Project } from '@/types/project';

export const seedProjects: Project[] = [
  {
    id: 'estate-portal',
    name: 'Real Estate Portal',
    description: 'A comprehensive property management platform featuring interactive resident directories, invoice tracking, automated utility billing, and financial analytics.',
    tags: ['React', 'FastAPI', 'Python', 'PostgreSQL', 'Tailwind CSS'],
    homepageUrl: 'http://localhost:3000',
    appUrl: 'http://localhost:3000/dashboard',
    repoUrl: 'https://github.com/user/estate-management',
    docsUrl: 'http://localhost:8000/docs', // FastAPI Swagger docs
    status: 'online',
    uptime24h: 99.95,
    responseTime: 48,
    history: [52, 45, 48, 55, 42, 50, 47, 49, 44, 48],
    colorTheme: 'blue'
  },
  {
    id: 'developer-portfolio',
    name: 'Developer Portfolio',
    description: 'A highly interactive, dark-themed personal showcase built with Next.js App Router and Framer Motion to display work experience, skills, and active coding projects.',
    tags: ['Next.js', 'React', 'Tailwind CSS', 'Framer Motion', 'TypeScript'],
    homepageUrl: 'https://rohit.dev',
    repoUrl: 'https://github.com/user/portfolio-site',
    status: 'online',
    uptime24h: 100.0,
    responseTime: 18,
    history: [22, 19, 17, 20, 18, 16, 21, 19, 15, 18],
    colorTheme: 'violet'
  },
  {
    id: 'task-scheduler',
    name: 'Async Task Orchestrator',
    description: 'A high-throughput distributed task runner designed to handle periodic cron jobs, asynchronous webhooks, and database maintenance scripting.',
    tags: ['Node.js', 'Redis', 'Docker', 'Express', 'TypeScript'],
    appUrl: 'http://localhost:4500/queues',
    repoUrl: 'https://github.com/user/task-orchestrator',
    status: 'sleeping',
    uptime24h: 98.4,
    responseTime: 312,
    history: [0, 0, 0, 0, 0, 310, 315, 308, 320, 312], // Zero means down or cold start
    colorTheme: 'amber'
  }
];
