'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = () => {
    // Clear authentication
    localStorage.clear();
    router.push('/');
  };

  const navItems = [
    { href: '/profile', label: 'Your Profile', icon: 'briefcase' },
    { href: '/debt-payoff', label: 'Debt Payoff', icon: 'calculator' },
    { href: '/best-locations', label: 'Best Locations', icon: 'location' },
    { href: '/rent-vs-buy', label: 'Rent vs Buy', icon: 'house' },
    { href: '/home-affordability', label: 'Home Affordability', icon: 'dollar' },
    { href: '/job-finder', label: 'Job Finder', icon: 'chart' },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/profile" className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#5BA4E5] to-[#4A93D4] rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#5BA4E5]">Cartographer</div>
                <div className="text-xs text-gray-500 -mt-1">Your Path to Homeownership</div>
              </div>
            </div>
          </Link>

          {/* Back to Home (when needed) */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  isActive(item.href)
                    ? 'border-[#5BA4E5] text-[#5BA4E5]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {/* Icon placeholder - will add specific icons */}
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
