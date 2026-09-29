"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (/\s/.test(pw)) return "Password cannot contain spaces.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  return null;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordsMatch = confirmPassword === password;
  const canSubmit = password && confirmPassword && !validatePassword(password) && passwordsMatch && token;

  const passwordChecks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "No spaces", met: password.length > 0 && !/\s/.test(password) },
    { label: "One capital letter", met: /[A-Z]/.test(password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">Invalid reset link</h1>
        <p className="text-slate-600 mb-6">This password reset link is missing or invalid.</p>
        <Link
          href="/forgot-password"
          className="inline-block bg-[#5BA4E5] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4A93D4] transition-all shadow-md"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">Password reset</h1>
        <p className="text-slate-600 mb-6">Your password has been updated successfully.</p>
        <Link
          href="/login"
          className="inline-block bg-[#5BA4E5] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4A93D4] transition-all shadow-md"
        >
          Log in with your new password
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Set a new password</h1>
      <p className="text-slate-600 mb-8">Choose a strong password for your account.</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-12 text-slate-800 focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] focus:outline-none"
              placeholder="Create a new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-2 space-y-1">
              {passwordChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-2 text-xs">
                  {check.met ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="6" />
                    </svg>
                  )}
                  <span className={check.met ? "text-emerald-600" : "text-slate-500"}>{check.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 text-slate-800 focus:outline-none ${
              confirmPassword && !passwordsMatch
                ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                : "border-slate-300 focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5]"
            }`}
            placeholder="Confirm your new password"
          />
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full bg-[#5BA4E5] text-white py-3 rounded-lg font-semibold hover:bg-[#4A93D4] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<p className="text-slate-600 text-center">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
