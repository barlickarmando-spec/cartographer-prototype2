"use client";

import Link from "next/link";

export default function TopNav() {
  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-slate-900"></div>
            <span className="text-xl font-semibold text-slate-900">Cartographer</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Login
            </Link>
            <Link
              href="/onboarding"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
