"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    fetch("/api/auth/demo-mode")
      .then((r) => r.json())
      .then((data) => setDemoMode(data.demo === true))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Server may have returned non-JSON (e.g. error page)
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      // Give the session cookie a moment to be set before navigating
      await new Promise((r) => setTimeout(r, 100));
      router.push("/questionnaire");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
        {demoMode && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 text-sm font-medium">
            Demo mode enabled
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Log in</h1>
        <p className="text-slate-600 mb-8">Use your username or email.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}
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
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-md disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Log in"}
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
