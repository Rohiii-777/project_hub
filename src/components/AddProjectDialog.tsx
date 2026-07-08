'use client';

import React, { useState } from 'react';
import { Project } from '@/types/project';
import { X, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (project: Omit<Project, 'history' | 'uptime24h' | 'responseTime'>) => void;
}

const themeColors: Project['colorTheme'][] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan'];

export default function AddProjectDialog({ isOpen, onClose, onAdd }: AddProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [colorTheme, setColorTheme] = useState<Project['colorTheme']>('blue');
  const [status, setStatus] = useState<Project['status']>('online');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [docsUrl, setDocsUrl] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Project name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    
    // Simple URL validation if provided
    const validateUrl = (url: string) => {
      if (!url) return true;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    if (homepageUrl && !validateUrl(homepageUrl)) newErrors.homepageUrl = 'Invalid URL (include http:// or https://)';
    if (appUrl && !validateUrl(appUrl)) newErrors.appUrl = 'Invalid URL (include http:// or https://)';
    if (repoUrl && !validateUrl(repoUrl)) newErrors.repoUrl = 'Invalid URL (include http:// or https://)';
    if (docsUrl && !validateUrl(docsUrl)) newErrors.docsUrl = 'Invalid URL (include http:// or https://)';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Process tags
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onAdd({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description,
      tags: tags.length > 0 ? tags : ['Web App'],
      colorTheme,
      status,
      homepageUrl: homepageUrl.trim() || undefined,
      appUrl: appUrl.trim() || undefined,
      repoUrl: repoUrl.trim() || undefined,
      docsUrl: docsUrl.trim() || undefined,
    });

    // Reset Form
    setName('');
    setDescription('');
    setTagsInput('');
    setColorTheme('blue');
    setStatus('online');
    setHomepageUrl('');
    setAppUrl('');
    setRepoUrl('');
    setDocsUrl('');
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-xl glass-panel rounded-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] bg-slate-900/90"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Add New Project Link</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Link and tag your apps without code imports</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Finance Dashboard"
                    className="glass-input"
                  />
                  {errors.name && <span className="text-[10px] text-rose-400 font-medium">{errors.name}</span>}
                </div>

                {/* Theme & Initial Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Theme Color</label>
                    <select
                      value={colorTheme}
                      onChange={e => setColorTheme(e.target.value as Project['colorTheme'])}
                      className="glass-input cursor-pointer"
                    >
                      {themeColors.map(color => (
                        <option key={color} value={color} className="bg-slate-900 text-slate-100">
                          {color.charAt(0).toUpperCase() + color.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as Project['status'])}
                      className="glass-input cursor-pointer"
                    >
                      <option value="online" className="bg-slate-900 text-emerald-400">Online</option>
                      <option value="offline" className="bg-slate-900 text-rose-400">Offline</option>
                      <option value="sleeping" className="bg-slate-900 text-amber-400">Sleeping</option>
                      <option value="maintenance" className="bg-slate-900 text-cyan-400">Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your project, features, stack..."
                  rows={3}
                  className="glass-input resize-none"
                />
                {errors.description && <span className="text-[10px] text-rose-400 font-medium">{errors.description}</span>}
              </div>

              {/* Tech Stack Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Tech Stack Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="e.g. Next.js, FastAPI, PostgreSQL, Docker"
                  className="glass-input"
                />
              </div>

              {/* Links Section */}
              <div className="border-t border-slate-800/60 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Project Connections (URLs)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400">Homepage URL</span>
                    <input
                      type="text"
                      value={homepageUrl}
                      onChange={e => setHomepageUrl(e.target.value)}
                      placeholder="https://myproject.com"
                      className="glass-input"
                    />
                    {errors.homepageUrl && <span className="text-[9px] text-rose-400">{errors.homepageUrl}</span>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400">App URL (Live Link)</span>
                    <input
                      type="text"
                      value={appUrl}
                      onChange={e => setAppUrl(e.target.value)}
                      placeholder="https://app.myproject.com"
                      className="glass-input"
                    />
                    {errors.appUrl && <span className="text-[9px] text-rose-400">{errors.appUrl}</span>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400">Repository URL</span>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/user/project"
                      className="glass-input"
                    />
                    {errors.repoUrl && <span className="text-[9px] text-rose-400">{errors.repoUrl}</span>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400">Documentation URL</span>
                    <input
                      type="text"
                      value={docsUrl}
                      onChange={e => setDocsUrl(e.target.value)}
                      placeholder="https://docs.myproject.com"
                      className="glass-input"
                    />
                    {errors.docsUrl && <span className="text-[9px] text-rose-400">{errors.docsUrl}</span>}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-800 pt-4 flex justify-end gap-3 bg-slate-950/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-100 flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  Add Link
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
