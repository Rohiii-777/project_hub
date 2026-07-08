'use client';

import React from 'react';
import { Project } from '@/types/project';
import { ExternalLink, FileText, Play, Server, Trash2, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Github = ({ size = 12, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
}

const themeStyles = {
  violet: {
    glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    border: 'hover:border-violet-500/30',
    sparkline: '#8b5cf6',
    gradient: 'from-violet-500/5'
  },
  emerald: {
    glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    border: 'hover:border-emerald-500/30',
    sparkline: '#10b981',
    gradient: 'from-emerald-500/5'
  },
  amber: {
    glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    border: 'hover:border-amber-500/30',
    sparkline: '#f59e0b',
    gradient: 'from-amber-500/5'
  },
  blue: {
    glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    border: 'hover:border-blue-500/30',
    sparkline: '#3b82f6',
    gradient: 'from-blue-500/5'
  },
  rose: {
    glow: 'group-hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    border: 'hover:border-rose-500/30',
    sparkline: '#f43f5e',
    gradient: 'from-rose-500/5'
  },
  cyan: {
    glow: 'group-hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    border: 'hover:border-cyan-500/30',
    sparkline: '#06b6d4',
    gradient: 'from-cyan-500/5'
  }
};

const statusConfigs = {
  online: { label: 'Online', color: 'bg-emerald-500', text: 'text-emerald-400 border-emerald-500/20' },
  offline: { label: 'Offline', color: 'bg-rose-500', text: 'text-rose-400 border-rose-500/20' },
  sleeping: { label: 'Sleeping', color: 'bg-amber-500', text: 'text-amber-400 border-amber-500/20' },
  maintenance: { label: 'Maintenance', color: 'bg-cyan-500', text: 'text-cyan-400 border-cyan-500/20' }
};

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const styles = themeStyles[project.colorTheme || 'blue'];
  const status = statusConfigs[project.status || 'online'];

  // SVG Sparkline calculation
  const generateSparkline = (history: number[]) => {
    if (!history || history.length < 2) return { path: '', area: '' };
    const width = 120;
    const height = 30;
    const padding = 2;

    // Filter out 0s (downtime) to find min/max response times, default to 10-200ms
    const activeValues = history.filter(v => v > 0);
    const maxVal = activeValues.length > 0 ? Math.max(...activeValues) : 200;
    const minVal = activeValues.length > 0 ? Math.min(...activeValues) : 10;
    const range = maxVal - minVal || 10;

    const points = history.map((val, index) => {
      const x = (index / (history.length - 1)) * width;
      // If down (0), draw it at the baseline
      const y = val === 0 
        ? height - padding 
        : height - padding - ((val - minVal) / range) * (height - padding * 2);
      return { x, y };
    });

    const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { path: pathD, area: areaD };
  };

  const sparkline = generateSparkline(project.history);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`group glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br ${styles.gradient} to-transparent border-t-2 border-t-transparent ${styles.border} ${styles.glow} min-h-[300px]`}
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${status.color} relative`}>
              {project.status === 'online' && (
                <span className={`absolute -inset-1 rounded-full ${status.color} opacity-40 pulse-soft`} />
              )}
            </div>
            <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border bg-slate-950/20 ${status.text}`}>
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all"
                title="Delete Project Link"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Project Name & Description */}
        <div className="space-y-2 mb-4">
          <h4 className="text-lg font-bold text-slate-100 group-hover:text-white flex items-center gap-1.5">
            {project.name}
            <ArrowUpRight size={16} className="text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed font-medium line-clamp-3">
            {project.description}
          </p>
        </div>
      </div>

      {/* Middle: Sparklines & Tech Stack */}
      <div className="space-y-4">
        {/* Latency & Sparkline */}
        <div className="flex items-center justify-between border-t border-slate-900 pt-4 pb-1">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Latency</span>
            <span className="text-sm font-semibold text-slate-200">
              {project.status === 'online' && project.responseTime > 0 ? `${project.responseTime}ms` : 'Offline'}
            </span>
          </div>
          
          {project.history && project.history.length > 0 && (
            <div className="h-8 flex flex-col items-end justify-center">
              <span className="text-[9px] text-slate-600 font-medium self-start mb-0.5 pr-2">Uptime: {project.uptime24h}%</span>
              <svg width="120" height="30" className="overflow-visible">
                <defs>
                  <linearGradient id={`grad-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={styles.sparkline} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={styles.sparkline} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <path
                  d={sparkline.area}
                  fill={`url(#grad-${project.id})`}
                />
                <path
                  d={sparkline.path}
                  fill="none"
                  stroke={styles.sparkline}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Tech Badges */}
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map(tag => (
            <span
              key={tag}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${styles.badge}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Bottom Actions Row */}
        <div className="flex items-center gap-2 border-t border-slate-900 pt-4 mt-2">
          {project.appUrl && (
            <a
              href={project.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-900 bg-slate-100 hover:bg-white rounded-lg py-2 transition-colors border border-transparent"
            >
              <Play size={11} className="fill-current" />
              Launch App
            </a>
          )}
          
          <div className="flex gap-2">
            {project.homepageUrl && (
              <a
                href={project.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
                title="Homepage"
              >
                <ExternalLink size={12} />
              </a>
            )}
            
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
                title="Code Repository"
              >
                <Github size={12} />
              </a>
            )}

            {project.docsUrl && (
              <a
                href={project.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
                title="Documentation"
              >
                <FileText size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
