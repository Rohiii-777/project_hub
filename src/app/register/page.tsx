import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import RegisterForm from './RegisterForm';
import { ShieldCheck } from 'lucide-react';

export default async function RegisterPage() {
  // Check if an admin user already exists. If so, redirect to login.
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#07080e] relative overflow-hidden">
      {/* Radial glows for modern premium background */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        {/* Logo and branding */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner shadow-indigo-500/5 pulse-soft">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight sm:text-3xl">
            Register Control Center
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Initialize your secure Project Hub developer environment.
          </p>
        </div>

        {/* Form container */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl">
          <RegisterForm />
        </div>
        
        <p className="text-center text-xs text-slate-500">
          Project Hub Security • Offline Database Storage
        </p>
      </div>
    </main>
  );
}
export const dynamic = 'force-dynamic';
