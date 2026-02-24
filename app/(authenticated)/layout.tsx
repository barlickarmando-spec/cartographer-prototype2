'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

  const allNavItems = [
    { href: '/profile', label: 'Your Profile', icon: 'briefcase' },
    { href: '/debt-payoff', label: 'Debt Payoff', icon: 'calculator' },
    { href: '/my-locations', label: 'My Locations', icon: 'location' },
    { href: '/rent-vs-buy', label: 'Rent vs Buy', icon: 'house' },
    { href: '/home-affordability', label: 'Home Affordability', icon: 'dollar' },
    { href: '/job-finder', label: 'Job Finder', icon: 'chart' },
  ];

  const navItems = allNavItems;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/profile" className="flex items-center shrink-0">
            <Image
              src="/Icons/Icons Transparent/Logo_transparent.png"
              alt="Cartographer"
              width={256}
              height={64}
              className="h-14 w-auto"
              priority
            />
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
