import Link from "next/link";
import Image from "next/image";

export default function SignupSuccessPage() {
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

      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Account created</h1>
        <p className="text-slate-600 mb-8">You can now log in or go to your account.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/account"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-md"
          >
            Go to account
          </Link>
        </div>
      </main>
    </div>
  );
}
