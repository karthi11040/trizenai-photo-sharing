import Link from "next/link";
import { Camera } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.png" alt="TrizenAI" className="h-7 w-auto object-contain" />
        </Link>
        <p className="text-xs text-slate-500 text-center md:text-left">
          &copy; {new Date().getFullYear()} TrizenAI. High-performance photography proofing & client delivery.
        </p>
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/login" className="hover:text-indigo-600 transition-colors">Studio Login</Link>
          <Link href="/register" className="hover:text-indigo-600 transition-colors">Create Studio</Link>
        </div>
      </div>
    </footer>
  );
}
