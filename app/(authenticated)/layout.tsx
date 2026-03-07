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
    { href: '/home-size-calculator', label: 'Home Size Calculator', icon: 'ruler' },
    { href: '/rent-vs-buy', label: 'Rent vs Buy', icon: 'house' },
    { href: '/home-affordability', label: 'Home Affordability', icon: 'dollar' },
    { href: '/job-finder', label: 'Job Finder', icon: 'chart' },
  ];

  const navItems = allNavItems;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="carto-headings min-h-screen bg-carto-sky">
      {/* Top Bar */}
      <div className="bg-white border-b border-carto-blue-pale/40">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
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
              className="text-sm text-carto-steel hover:text-carto-slate font-heading font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-white border-b border-carto-blue-pale/40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-5 py-3.5 border-b-2 transition-colors whitespace-nowrap ${
                  isActive(item.href)
                    ? 'border-carto-blue text-carto-blue'
                    : 'border-transparent text-carto-steel hover:text-carto-slate hover:border-carto-blue-pale'
                }`}
              >
                <span className="text-sm font-heading font-semibold">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
