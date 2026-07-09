'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types/project';
import StatsOverview from '@/components/StatsOverview';
import ProjectCard from '@/components/ProjectCard';
import AddProjectDialog from '@/components/AddProjectDialog';
import GithubSyncModal from '@/components/GithubSyncModal';
import { Plus, Search, RefreshCw, Layers, SlidersHorizontal, Activity, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/app/actions/auth';
import { createProject, deleteProject, updateScannedStatus, getProjects, updateProject } from '@/app/actions/projects';

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

interface DashboardClientProps {
  initialProjects: Project[];
  username: string;
}

export default function DashboardClient({ initialProjects, username }: DashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGithubOpen, setIsGithubOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('Never');

  useEffect(() => {
    const cachedScan = sessionStorage.getItem('hub-last-scan-time');
    if (cachedScan) {
      setTimeout(() => {
        setLastScanTime(cachedScan);
      }, 0);
    }
  }, []);

  const handleCloseAdd = () => {
    setEditingProject(null);
    setIsAddOpen(false);
  };

  const handleStartEdit = (project: Project) => {
    setEditingProject(project);
    setIsAddOpen(true);
  };

  const handleAddProject = async (newProj: Omit<Project, 'history' | 'uptime24h' | 'responseTime'>) => {
    try {
      const savedProj = await createProject(newProj);
      setProjects((prev) => [savedProj, ...prev]);
      setIsAddOpen(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project. Please verify inputs.');
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updatedProj = await updateProject(id, updates);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updatedProj : p))
      );
      setIsAddOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to update project:', err);
      alert('Failed to update project. Please verify inputs.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project.');
    }
  };

  const refreshProjectCatalog = async () => {
    try {
      const updatedList = await getProjects();
      setProjects(updatedList);
    } catch (err) {
      console.error('Failed to refresh catalog:', err);
    }
  };

  // Perform Server-Side Ping Scanning
  const handleScanStatus = async () => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const scanUpdates = await Promise.all(
        projects.map(async (project) => {
          // Choose either appUrl or homepageUrl, prioritizing App URL
          const targetUrl = project.appUrl || project.homepageUrl;
          
          // Skip projects that are purely local files with no server URLs
          if (!targetUrl) {
            return {
              id: project.id,
              status: project.status,
              responseTime: project.responseTime,
              history: project.history,
              uptime24h: project.uptime24h,
            };
          }

          try {
            const res = await fetch(`/api/monitor?url=${encodeURIComponent(targetUrl)}`);
            if (!res.ok) throw new Error('Failed to ping');
            
            const data = await res.json();
            const latency = data.latency;
            const isOnline = data.status === 'online';

            // Update project history and metrics
            const newHistory = [...project.history.slice(1), isOnline ? latency : 0];
            
            // Calculate Uptime (percentage of non-zero entries in history)
            const onlineCount = newHistory.filter((v) => v > 0).length;
            const calculatedUptime = parseFloat(((onlineCount / newHistory.length) * 100).toFixed(2));

            return {
              id: project.id,
              status: (isOnline ? 'online' : 'offline') as Project['status'],
              responseTime: isOnline ? latency : 0,
              history: newHistory,
              uptime24h: calculatedUptime,
            };
          } catch {
            // If ping fails
            const newHistory = [...project.history.slice(1), 0];
            const onlineCount = newHistory.filter((v) => v > 0).length;
            const calculatedUptime = parseFloat(((onlineCount / newHistory.length) * 100).toFixed(2));

            return {
              id: project.id,
              status: 'offline' as Project['status'],
              responseTime: 0,
              history: newHistory,
              uptime24h: calculatedUptime,
            };
          }
        })
      );

      // Save scan updates in database
      await updateScannedStatus(scanUpdates);

      // Re-fetch project records to align with SQLite status updates
      await refreshProjectCatalog();

      const timeString = new Date().toLocaleTimeString();
      setLastScanTime(timeString);
      sessionStorage.setItem('hub-last-scan-time', timeString);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Filtered project list
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      project.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      {/* Top Console Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers size={18} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight sm:text-2xl">
              Project Command Center
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Monitor deployments, run local servers, and sync GitHub repos.</span>
            <span className="h-3 w-px bg-slate-800" />
            <span className="text-indigo-400 font-bold">Admin: {username}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* GitHub Sync Trigger */}
          <button
            onClick={() => setIsGithubOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <Github size={13} />
            Sync GitHub
          </button>

          {/* Scan Actions */}
          <button
            onClick={handleScanStatus}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Pinging...' : 'Scan Status'}
          </button>
          
          {/* Add Link Action */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-100 transition-colors shadow-lg shadow-indigo-500/10 border border-transparent cursor-pointer"
          >
            <Plus size={14} />
            Add Project
          </button>

          {/* Secure Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut size={15} />
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
                onRefresh={refreshProjectCatalog}
                onEdit={handleStartEdit}
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
                : 'Click "Add Project" to add connections or "Sync GitHub" to pull remote repos.'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Add Project Dialog */}
      <AddProjectDialog
        key={isAddOpen ? (editingProject ? `edit-${editingProject.id}` : 'add-active') : 'add-closed'}
        isOpen={isAddOpen}
        onClose={handleCloseAdd}
        onAdd={handleAddProject}
        project={editingProject || undefined}
        onUpdate={handleUpdateProject}
      />

      {/* GitHub Sync Modal */}
      <GithubSyncModal
        isOpen={isGithubOpen}
        onClose={() => setIsGithubOpen(false)}
        onImportSuccess={refreshProjectCatalog}
      />
    </div>
  );
}
