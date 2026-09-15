import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Camera,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Calendar,
  Users,
} from "lucide-react";

import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const targetUrl = (user.is_superuser || user.profile.role === "ADMIN" || user.profile.role === "CO_ADMIN")
      ? `/dashboard/admin/${user.profile.dashboard_token}`
      : `/dashboard/team`;
    redirect(targetUrl);
  }

  const navUser = null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        <Navbar user={navUser} />

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-xs font-semibold text-indigo-700">
                <Sparkles className="w-3.5 h-3.5" />
                Enterprise Photography Delivery & Proofing Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Streamline your studio shoots, multi-camera ingests & PIN client proofing.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                TrizenAI empowers professional photography studios with instant multi-photographer collaboration, exact upload-day shoot preservation, and zero-friction client delivery.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-6 py-3 bg-studio-accent active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Create Free Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
                >
                  Studio Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for Professional Photography Workflows
            </h2>
            <p className="text-sm text-slate-500">
              Everything needed to manage shoots, team shooters, and client proofing at scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Exact Upload-Day Ingest</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Preserve multi-day shoots with discrete chronological timeline partitioning without merging photo days.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Multi-Shooter Assignments</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Assign primary photographers, assistants, and co-administrators to individual events with role-gated permissions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Client PIN Proofing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Zero-knowledge numeric keypad PIN protection for client galleries with telemetry audit logs and proofing selection.
              </p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
