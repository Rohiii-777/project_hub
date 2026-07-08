'use client';

import React from 'react';
import { Project } from '@/types/project';
import { Folder, Activity, Server, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsOverviewProps {
  projects: Project[];
}

export default function StatsOverview({ projects }: StatsOverviewProps) {
  const totalProjects = projects.length;
  
  const activeProjects = projects.filter(p => p.status === 'online').length;
  
  const avgUptime = totalProjects > 0
    ? (projects.reduce((acc, p) => acc + p.uptime24h, 0) / totalProjects).toFixed(2)
    : '0.00';
    
  const onlineProjectsWithResponseTime = projects.filter(
    p => p.status === 'online' && p.responseTime > 0
  );
  const avgResponseTime = onlineProjectsWithResponseTime.length > 0
    ? Math.round(
        onlineProjectsWithResponseTime.reduce((acc, p) => acc + p.responseTime, 0) / 
        onlineProjectsWithResponseTime.length
      )
    : 0;

  const stats = [
    {
      label: 'Total Projects',
      value: totalProjects,
      icon: Folder,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      description: 'Configured project portals'
    },
    {
      label: 'Global Uptime',
      value: `${avgUptime}%`,
      icon: Activity,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Average past 24 hours'
    },
    {
      label: 'Active Systems',
      value: `${activeProjects}/${totalProjects}`,
      icon: Server,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: 'Currently responding'
    },
    {
      label: 'Average Latency',
      value: avgResponseTime > 0 ? `${avgResponseTime}ms` : 'N/A',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Active endpoint response'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="glass-panel p-5 rounded-2xl flex items-center justify-between relative overflow-hidden"
          >
            {/* Soft background glow */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-10 bg-current ${stat.color.split(' ')[0]}`} />
            
            <div className="space-y-1 z-10">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</span>
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{stat.value}</h3>
              <p className="text-[10px] text-slate-500 font-medium">{stat.description}</p>
            </div>
            
            <div className={`p-3 rounded-xl border ${stat.color} flex items-center justify-center z-10`}>
              <Icon size={20} className="stroke-[1.5]" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
