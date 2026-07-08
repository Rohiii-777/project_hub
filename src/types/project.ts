export interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  homepageUrl?: string;
  appUrl?: string;
  repoUrl?: string;
  docsUrl?: string;
  status: 'online' | 'offline' | 'sleeping' | 'maintenance';
  uptime24h: number;
  responseTime: number;
  history: number[]; // Last 10 latency metrics in ms
  colorTheme: 'violet' | 'emerald' | 'amber' | 'blue' | 'rose' | 'cyan';
}
