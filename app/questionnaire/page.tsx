"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function QuestionnairePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; email: string; isDemo?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (data.user) setUser(data.user);
        else router.replace("/login");
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={200}
                height={50}
                className="h-10 w-auto"
              />
            </Link>
            <Link href="/account" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Account
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Questionnaire placeholder</h1>
        <p className="text-slate-600 mb-2">
          Logged in as <span className="font-semibold text-slate-800">{user.username}</span>
        </p>
        <p className="text-slate-600 mb-8">
          Email: <span className="text-slate-800">{user.email}</span>
        </p>
        {user.isDemo && (
          <p className="text-sm text-amber-600 mb-8">Demo mode — no data is saved.</p>
        )}
      </main>
    </div>
  );
}
