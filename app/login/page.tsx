"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Simulate a brief loading state for UX
    await new Promise((r) => setTimeout(r, 500));
    
    // FACADE: Skip auth completely, go straight to onboarding
    router.push("/onboarding");
  }

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
            <Link href="/signup" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-16">
        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 text-sm font-medium">
          Testing Mode: No authentication required
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Log in</h1>
        <p className="text-slate-600 mb-8">Enter anything to test the survey.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-slate-700 mb-1">
              Username or email
            </label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              placeholder="anything works"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-md disabled:opacity-60"
          >
            {loading ? "Starting..." : "Start Survey"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-cyan-600 font-medium hover:text-cyan-700">
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
