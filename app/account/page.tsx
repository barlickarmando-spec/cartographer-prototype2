import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LogoutButton } from "./LogoutButton";

// This page uses Prisma + cookies at runtime, skip static pre-rendering
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, email: true, createdAt: true },
  });
  if (!user) redirect("/login");

  const createdAtFormatted = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
            <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Account</h1>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <p className="text-slate-600">
            Logged in as <span className="font-semibold text-slate-800">{user.username}</span>
          </p>
          <p className="text-slate-600">
            <span className="text-slate-500">Email:</span> {user.email}
          </p>
          <p className="text-slate-600">
            <span className="text-slate-500">Member since:</span> {createdAtFormatted}
          </p>
          <div className="pt-4">
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  );
}
