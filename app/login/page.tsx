"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import Card from "@/components/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fake auth - just set localStorage flag
    localStorage.setItem("cartographer-user", JSON.stringify({ email, authenticated: true }));
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <h1 className="mb-6 text-2xl font-semibold text-slate-900">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>
          <div className="mt-6">
            <button
              type="button"
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Continue with Google
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-slate-600">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-slate-900 hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
