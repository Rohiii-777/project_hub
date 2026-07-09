'use client';

import React, { useActionState } from 'react';
import { login, ActionState } from '../actions/auth';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';

const initialState: ActionState = {};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Username Field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Username
        </label>
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="Enter username"
            className="glass-input pl-10 w-full font-medium"
            disabled={isPending}
          />
        </div>
        {state.errors?.username && (
          <p className="text-xs font-semibold text-rose-400 mt-1">
            {state.errors.username[0]}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Password
        </label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Enter password"
            className="glass-input pl-10 w-full font-medium"
            disabled={isPending}
          />
        </div>
        {state.errors?.password && (
          <p className="text-xs font-semibold text-rose-400 mt-1">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {/* Auth Errors */}
      {state.errors?.general && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          {state.errors.general[0]}
        </div>
      )}

      {/* Login Action Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2 text-sm font-bold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-100 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/10 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Authenticating Console...
          </>
        ) : (
          <>
            Unlock Command Center
            <ArrowRight size={15} />
          </>
        )}
      </button>
    </form>
  );
}
