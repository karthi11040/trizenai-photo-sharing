import React from "react";
import Link from "next/link";
import { Camera, ShieldCheck, Zap, Layers, Sparkles, Image as ImageIcon, Lock, CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Left Column: Refined Auth Form Container */}
      <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white text-slate-900 shadow-2xl relative z-10">
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/logo.png"
              alt="TrizenAI"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Studio Portal
          </span>
        </div>

        {/* Dynamic Form Content */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {children}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>&copy; {new Date().getFullYear()} TrizenAI Inc.</span>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Enterprise Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Luxury Dark Photography Studio Showcase */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 bg-slate-950 text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Background Ambient Glowing Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/25 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 right-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Decorative Grid Mesh Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Top Feature Pill */}
        <div className="relative z-10 flex justify-end">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs font-semibold text-indigo-200 shadow-xl">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Multi-Shooter Ingest Pipeline</span>
          </div>
        </div>

        {/* Center Main Copy & Visual Mockup */}
        <div className="relative z-10 my-auto max-w-xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5" /> High-Resolution Proofing Platform
            </div>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
              Deliver stunning client galleries with zero hassle.
            </h2>
            <p className="text-slate-300 text-base leading-relaxed font-normal">
              Empower your photography studio with multi-camera shoot indexing, instant client PIN authorization, and high-speed proofing.
            </p>
          </div>

          {/* Interactive Feature Cards */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white">Instant Ingest</p>
              <p className="text-[11px] text-slate-400 leading-tight">Sync RAW and JPEG files effortlessly</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white">PIN Keypad</p>
              <p className="text-[11px] text-slate-400 leading-tight">Dynamic PIN length client unlock</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white">Custom Themes</p>
              <p className="text-[11px] text-slate-400 leading-tight">Tailor fonts, colors & branding</p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span className="font-mono text-slate-300">TrizenAI Studio v3.2</span>
          </div>
          <span>Fast, Reliable & Encrypted</span>
        </div>
      </div>
    </div>
  );
}

