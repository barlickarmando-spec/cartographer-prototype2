"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      setSent(true);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
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
            <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-16">
        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Reset your password</h1>
            <p className="text-slate-600 mb-8">
              Enter the email address associated with your account and we&apos;ll help you reset your password.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5BA4E5] text-white py-3 rounded-lg font-semibold hover:bg-[#4A93D4] transition-all shadow-md disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{" "}
              <Link href="/login" className="text-[#5BA4E5] font-medium hover:text-[#4A93D4]">
                Log in
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-3">Check your email</h1>
            <p className="text-slate-600 mb-6">
              If an account exists for <span className="font-medium text-slate-800">{email}</span>, you&apos;ll receive password reset instructions.
            </p>

            {resetToken && (
              <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-left">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Development mode: Use this link to reset your password
                </p>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="text-sm text-[#5BA4E5] font-medium hover:text-[#4A93D4] break-all"
                >
                  Reset password now →
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full py-3 rounded-lg font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all text-center"
              >
                Back to log in
              </Link>
              <button
                onClick={() => { setSent(false); setResetToken(null); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Try a different email
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
