'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Project } from '@/types/project';
import { 
  ExternalLink, FileText, Play, Trash2, ArrowUpRight, 
  Terminal, Square, Loader2, RefreshCw, Pencil 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  onRefresh?: () => void;
  onEdit?: (project: Project) => void;
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

export default function ProjectCard({ project, onDelete, onRefresh, onEdit }: ProjectCardProps) {
  const styles = themeStyles[project.colorTheme || 'blue'];
  const status = statusConfigs[project.status || 'online'];
  
  const [isActionPending, setIsActionPending] = useState(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  // Poll logs if expanded and process is active
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/process/${project.id}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error('Failed to fetch process logs:', err);
      }
    };

    if (isLogsExpanded) {
      fetchLogs(); // initial load
      // Poll every 2 seconds
      intervalId = setInterval(fetchLogs, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLogsExpanded, project.id, project.isLocalActive]);

  // Auto-scroll logs terminal to bottom on content updates
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isLogsExpanded]);

  const handleToggleProcess = async () => {
    setIsActionPending(true);
    const action = project.isLocalActive ? 'stop' : 'start';
    
    try {
      const res = await fetch(`/api/process/${project.id}?action=${action}`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to trigger process change');
      }

      if (action === 'start') {
        setIsLogsExpanded(true); // Auto expand logs when starting
      }
      
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || `Failed to ${action} process.`);
    } finally {
      setIsActionPending(false);
    }
  };

  // SVG Sparkline calculation
  const generateSparkline = (history: number[]) => {
    if (!history || history.length < 2) return { path: '', area: '' };
    const width = 120;
    const height = 30;
    const padding = 2;

    const activeValues = history.filter(v => v > 0);
    const maxVal = activeValues.length > 0 ? Math.max(...activeValues) : 200;
    const minVal = activeValues.length > 0 ? Math.min(...activeValues) : 10;
    const range = maxVal - minVal || 10;

    const points = history.map((val, index) => {
      const x = (index / (history.length - 1)) * width;
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
            <div className={`w-2.5 h-2.5 rounded-full ${project.isLocalActive ? 'bg-emerald-500' : status.color} relative`}>
              {(project.status === 'online' || project.isLocalActive) && (
                <span className={`absolute -inset-1 rounded-full ${project.isLocalActive ? 'bg-emerald-500' : status.color} opacity-40 pulse-soft`} />
              )}
            </div>
            <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border bg-slate-950/20 ${project.isLocalActive ? 'text-emerald-400 border-emerald-500/20' : status.text}`}>
              {project.isLocalActive ? 'Active Local' : status.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <button
                onClick={() => onEdit(project)}
                className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-indigo-500/20 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 transition-all cursor-pointer"
                title="Edit Project Details"
              >
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
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
            {project.appUrl || project.homepageUrl ? (
              <a 
                href={project.appUrl || project.homepageUrl} 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-indigo-400 transition-colors"
              >
                <ArrowUpRight size={16} className="text-slate-500 hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
              </a>
            ) : null}
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
          {project.tags.map((tag) => (
            <span
              key={tag}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${styles.badge}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Executable Path Info */}
        {project.localPath && (
          <div className="p-2 rounded bg-slate-950/30 border border-slate-900/60 font-mono text-[9px] text-slate-400 flex flex-col gap-0.5">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">Local Script:</span>
            <span className="truncate">{project.localPath}</span>
            <span className="text-indigo-400 font-medium truncate">{project.startCommand}</span>
          </div>
        )}

        {/* Bottom Actions Row */}
        <div className="flex flex-col gap-2 border-t border-slate-900 pt-4 mt-2">
          <div className="flex items-center gap-2">
            {/* Play/Stop Local Process Trigger */}
            {project.localPath && project.startCommand ? (
              <button
                onClick={handleToggleProcess}
                disabled={isActionPending}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg py-2 transition-colors border cursor-pointer ${
                  project.isLocalActive
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                    : 'text-slate-900 bg-slate-100 hover:bg-white border-transparent'
                }`}
              >
                {isActionPending ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : project.isLocalActive ? (
                  <>
                    <Square size={11} className="fill-current" />
                    Stop Server
                  </>
                ) : (
                  <>
                    <Play size={11} className="fill-current" />
                    Start Server
                  </>
                )}
              </button>
            ) : project.appUrl ? (
              <a
                href={project.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-900 bg-slate-100 hover:bg-white rounded-lg py-2 transition-colors border border-transparent"
              >
                <Play size={11} className="fill-current" />
                Launch App
              </a>
            ) : null}

            {/* Logs Button */}
            {project.localPath && project.startCommand && (
              <button
                onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  isLogsExpanded
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    : 'bg-slate-950/40 hover:bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Terminal Logs"
              >
                <Terminal size={12} />
              </button>
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

          {/* Terminal log panel */}
          <AnimatePresence>
            {isLogsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Terminal size={8} /> Shell Console Output
                  </span>
                  <button 
                    onClick={() => setLogs([])}
                    className="text-[8px] font-bold text-indigo-400/80 hover:text-indigo-400 flex items-center gap-0.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={8} /> Clear Buffer
                  </button>
                </div>
                <div ref={terminalRef} className="p-3 rounded-lg bg-[#04050a]/90 border border-slate-900 font-mono text-[9px] text-slate-300 max-h-40 overflow-y-auto flex flex-col gap-1 scrollbar-thin select-text scroll-smooth">
                  {logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all leading-normal border-b border-transparent hover:bg-slate-950/50">
                      {log}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-slate-600 italic">No output logs received. Start the server to see log traces.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
