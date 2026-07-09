'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Key, User, RefreshCw, Search, 
  ExternalLink, CheckCircle2, DownloadCloud, Loader2 
} from 'lucide-react';
import { 
  saveGithubCredentials, getGithubCredentials, 
  fetchGithubRepos, importGithubRepo, GithubRepo 
} from '@/app/actions/github';

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

interface GithubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export default function GithubSyncModal({ isOpen, onClose, onImportSuccess }: GithubSyncModalProps) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'repos'>('config');
  
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    setSuccessMsg(null);
    onClose();
  };

  const syncRepositories = async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const result = await fetchGithubRepos();
      if (result.error) {
        setError(result.error);
        if (result.error.includes('credentials')) {
          setActiveTab('config');
        }
      } else if (result.repos) {
        setRepos(result.repos);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to connect to GitHub.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Load existing credentials on mount / open
  useEffect(() => {
    if (isOpen) {
      getGithubCredentials()
        .then((creds) => {
          setUsername(creds.username);
          setHasSavedToken(creds.hasToken);
          if (creds.username && creds.hasToken) {
            setActiveTab('repos');
            syncRepositories();
          } else {
            setActiveTab('config');
          }
        })
        .catch(() => {
          setActiveTab('config');
        });
    }
  }, [isOpen]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !token) return;

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await saveGithubCredentials(username, token);
      setHasSavedToken(true);
      setSuccessMsg('GitHub credentials saved successfully.');
      setToken(''); // Clear token field for security
      
      // Auto switch to repos tab and sync
      setActiveTab('repos');
      await syncRepositories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to save credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = async (repo: GithubRepo) => {
    setImportingId(repo.id);
    setError(null);

    try {
      const res = await importGithubRepo(repo);
      if (res.success) {
        // Mark as imported in local state
        setRepos((prev) =>
          prev.map((r) => (r.id === repo.id ? { ...r, isImported: true } : r))
        );
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setError(res.error || 'Failed to import repository.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to import repository.');
    } finally {
      setImportingId(null);
    }
  };

  // Filter repos based on search
  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-[#020306]/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Github size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100 tracking-tight sm:text-base">
                    Sync GitHub Repositories
                  </h3>
                  <p className="text-xs text-slate-400">
                    Import projects from your GitHub profile as monitored portals.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-900 px-6 bg-slate-950/10 gap-4">
              <button
                onClick={() => setActiveTab('config')}
                className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'config'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                1. API Settings
              </button>
              <button
                onClick={() => {
                  if (username && hasSavedToken) {
                    setActiveTab('repos');
                  }
                }}
                disabled={!username || !hasSavedToken}
                className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer disabled:opacity-30 ${
                  activeTab === 'repos'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                2. Select Repositories
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* Messages */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  {successMsg}
                </div>
              )}

              {activeTab === 'config' ? (
                /* Tab 1: Config Form */
                <form onSubmit={handleSaveCredentials} className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      GitHub Username
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. Rohiii-777"
                        className="glass-input pl-9 w-full"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Personal Access Token (PAT)
                      </label>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:user"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-0.5"
                      >
                        Generate Token <ExternalLink size={10} />
                      </a>
                    </div>
                    <div className="relative">
                      <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        required={!hasSavedToken}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder={hasSavedToken ? '•••••••••••••••••••••••• (Saved)' : 'ghp_xxxxxxxxxxxxxxxxxxxxxx'}
                        className="glass-input pl-9 w-full"
                        disabled={isSaving}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Credentials are saved locally in your project&apos;s private SQLite file. Your PAT requires the `repo` scope to list private/public projects and the `read:user` scope.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2 text-sm font-bold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-100 disabled:opacity-50 transition-colors shadow-lg cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving Credentials...
                      </>
                    ) : (
                      <>
                        Save & Sync Repositories
                        <RefreshCw size={14} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Tab 2: Repo List */
                <div className="flex flex-col gap-4">
                  {/* Search and Refresh Action Bar */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search GitHub repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="glass-input pl-9 py-1.5 text-xs w-full"
                        disabled={isSyncing}
                      />
                    </div>
                    <button
                      onClick={syncRepositories}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-300 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </button>
                  </div>

                  {/* List of Repos */}
                  <div className="flex flex-col gap-2.5 max-h-[45vh] overflow-y-auto pr-1">
                    {isSyncing && repos.length === 0 ? (
                      <div className="py-16 text-center">
                        <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                        <p className="text-xs text-slate-400">Loading repositories from GitHub...</p>
                      </div>
                    ) : filteredRepos.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
                        <DownloadCloud size={28} className="mx-auto text-slate-600 mb-2 stroke-[1.2]" />
                        <p className="text-xs text-slate-400 font-bold">No repositories found</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {searchQuery ? 'Try clearing your search query.' : 'Click Sync to query GitHub.'}
                        </p>
                      </div>
                    ) : (
                      filteredRepos.map((repo) => (
                        <div
                          key={repo.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-900/60 bg-slate-950/20 hover:border-slate-800/60 hover:bg-slate-900/10 transition-all"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-slate-200 truncate">
                                {repo.name}
                              </span>
                              {repo.language && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-850 border border-slate-800 text-slate-400">
                                  {repo.language}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-md">
                              {repo.description || 'No description provided.'}
                            </p>
                            {repo.homepageUrl && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 mt-1 font-medium">
                                Deployed: {repo.homepageUrl}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {repo.isImported ? (
                              <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-400">
                                <CheckCircle2 size={13} />
                                Imported
                              </div>
                            ) : (
                              <button
                                onClick={() => handleImport(repo)}
                                disabled={importingId === repo.id}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                {importingId === repo.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  'Import'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
