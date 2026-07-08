'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types/project';
import { seedProjects } from '@/data/seedData';
import StatsOverview from '@/components/StatsOverview';
import ProjectCard from '@/components/ProjectCard';
import AddProjectDialog from '@/components/AddProjectDialog';
import { Plus, Search, RefreshCw, Layers, SlidersHorizontal, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('Never');

  // Load from local storage or fall back to seed data
  useEffect(() => {
    const stored = localStorage.getItem('developer-hub-projects');
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch {
        setProjects(seedProjects);
        localStorage.setItem('developer-hub-projects', JSON.stringify(seedProjects));
      }
    } else {
      setProjects(seedProjects);
      localStorage.setItem('developer-hub-projects', JSON.stringify(seedProjects));
    }
  }, []);

  const saveProjects = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem('developer-hub-projects', JSON.stringify(updated));
  };

  const handleAddProject = (newProj: Omit<Project, 'history' | 'uptime24h' | 'responseTime'>) => {
    // Generate initial history for the new project
    const initialHistory = newProj.status === 'online' 
      ? Array.from({ length: 10 }, () => Math.floor(Math.random() * 80) + 20)
      : Array.from({ length: 10 }, () => 0);

    const project: Project = {
      ...newProj,
      uptime24h: newProj.status === 'online' ? 100 : 0,
      responseTime: newProj.status === 'online' ? initialHistory[9] : 0,
      history: initialHistory
    };

    saveProjects([...projects, project]);
  };

  const handleDeleteProject = (id: string) => {
    const filtered = projects.filter(p => p.id !== id);
    saveProjects(filtered);
  };

  // Perform Server-Side Ping Scanning
  const handleScanStatus = async () => {
    if (isScanning) return;
    setIsScanning(true);

    const updatedProjects = await Promise.all(
      projects.map(async (project) => {
        // Choose either appUrl or homepageUrl, prioritizing App URL
        const targetUrl = project.appUrl || project.homepageUrl;
        if (!targetUrl) return project;

        try {
          const res = await fetch(`/api/monitor?url=${encodeURIComponent(targetUrl)}`);
          if (!res.ok) throw new Error('Failed to ping');
          
          const data = await res.json();
          const latency = data.latency;
          const isOnline = data.status === 'online';

          // Update project history and metrics
          const newHistory = [...project.history.slice(1), isOnline ? latency : 0];
          const activeHistory = newHistory.filter(v => v > 0);
          
          // Calculate Uptime (percentage of non-zero entries in history)
          const onlineCount = newHistory.filter(v => v > 0).length;
          const calculatedUptime = parseFloat(((onlineCount / newHistory.length) * 100).toFixed(2));

          return {
            ...project,
            status: isOnline ? 'online' : ('offline' as Project['status']),
            responseTime: isOnline ? latency : 0,
            uptime24h: calculatedUptime,
            history: newHistory,
          };
        } catch {
          // If ping fails
          const newHistory = [...project.history.slice(1), 0];
          return {
            ...project,
            status: 'offline' as Project['status'],
            responseTime: 0,
            uptime24h: parseFloat(((newHistory.filter(v => v > 0).length / newHistory.length) * 100).toFixed(2)),
            history: newHistory,
          };
        }
      })
    );

    saveProjects(updatedProjects);
    setLastScanTime(new Date().toLocaleTimeString());
    setIsScanning(false);
  };

  // Filtered project list
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      {/* Top Console Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers size={18} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight sm:text-2xl">
              Project Command Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Monitor deployments, access developer portals, and inspect service latencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Scan Actions */}
          <button
            onClick={handleScanStatus}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Pinging...' : 'Scan Status'}
          </button>
          
          {/* Add Link Action */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-100 transition-colors shadow-lg shadow-indigo-500/10 border border-transparent"
          >
            <Plus size={14} />
            Add Project
          </button>
        </div>
      </div>

      {/* Aggregate Stats Overview */}
      <StatsOverview projects={projects} />

      {/* Search and Filters Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950/20 p-4 rounded-xl border border-slate-900">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, tags, or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="glass-input pl-10 w-full"
          />
        </div>

        {/* Filters pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">
            <SlidersHorizontal size={12} />
            Filter
          </div>
          {['all', 'online', 'offline', 'sleeping', 'maintenance'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                statusFilter === filter
                  ? 'bg-slate-100 text-slate-900 border-transparent font-bold'
                  : 'bg-transparent text-slate-400 border-slate-900 hover:border-slate-800 hover:text-slate-300'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Project Cards */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider px-1">
          <span>Active Portals ({filteredProjects.length})</span>
          <span className="flex items-center gap-1">
            <Activity size={10} />
            Last Scan: {lastScanTime}
          </span>
        </div>

        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel py-16 text-center rounded-2xl border border-dashed border-slate-800"
          >
            <Layers className="mx-auto text-slate-600 mb-3 stroke-[1.2]" size={36} />
            <h3 className="text-sm font-bold text-slate-300">No project portals found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try broadening your search or resetting your status filters.'
                : 'Click "Add Project" to add connections to your apps and portals.'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Dynamic Modal Dialog */}
      <AddProjectDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddProject}
      />
    </div>
  );
}
