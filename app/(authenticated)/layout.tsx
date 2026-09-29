'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GlobalSearchBar from '@/components/GlobalSearchBar';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSignOut = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.clear();
    router.push('/');
  };

  const navItems = [
    { href: '/profile', label: 'Your Profile', mobileLabel: 'Profile', icon: 'user' },
    { href: '/my-locations', label: 'My Locations', mobileLabel: 'Locations', icon: 'location' },
    { href: '/home-size-calculator', label: 'Home Size Calculator', mobileLabel: 'Calculator', icon: 'ruler' },
    { href: '/rent-vs-buy', label: 'Rent vs Buy', mobileLabel: 'Rent/Buy', icon: 'house' },
    { href: '/home-affordability', label: 'Home Affordability', mobileLabel: 'Afford.', icon: 'dollar' },
    { href: '/wealth-generation', label: 'Wealth Generation', mobileLabel: 'Wealth', icon: 'growth' },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  const iconForKey = (key: string, className = 'w-5 h-5') => {
    switch (key) {
      case 'user':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case 'location':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
      case 'ruler':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
      case 'house':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
      case 'dollar':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'growth':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
      default:
        return null;
    }
  };

  return (
    <div className="carto-headings min-h-screen bg-carto-sky">
      {/* Top Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo */}
            <Link href="/profile" className="flex items-center shrink-0 h-16 py-1">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={320}
                height={80}
                className="h-full w-auto"
                priority
              />
            </Link>

            {/* Search bar — desktop */}
            <div className="hidden md:block w-64 lg:w-80 ml-4">
              <GlobalSearchBar />
            </div>

            {/* Center nav links — desktop */}
            <div className="hidden md:flex flex-1 items-center justify-center gap-6">
              <Link href="/home-size-calculator" className="text-sm text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
                Calculator
              </Link>
              <Link href="/home-affordability" className="text-sm text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
                Analysis
              </Link>
              <Link href="/my-locations" className="text-sm text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
                Research
              </Link>
              <Link href="/wealth-generation" className="text-sm text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
                Wealth
              </Link>
            </div>

            {/* Right side — search (mobile) + Settings + Sign Out */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
              {/* Mobile search toggle */}
              <button
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="md:hidden text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <Link
                href="/profile"
                className="text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={handleSignOut}
                className="bg-[#4A90D9] text-white text-sm font-medium px-5 py-2 rounded-lg border-2 border-[#4A90D9] hover:bg-[#3A7BC0] hover:border-[#3A7BC0] transition-colors shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile search bar — slides down below the nav */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-slate-100 bg-white">
            <div className="pt-2">
              <GlobalSearchBar />
            </div>
          </div>
        )}
      </nav>

      {/* Body: sidebar + content */}
      <div className="flex pt-16 min-h-screen">
        {/* Left Sidebar — desktop */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 fixed top-16 left-0 bottom-0 bg-gradient-to-br from-[#4A90D9] to-[#3A7BC0] overflow-y-auto">
          <nav className="flex-1 py-4 px-3 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3.5 text-sm font-heading font-semibold transition-all duration-200 text-black rounded-l-lg rounded-r-full ${
                  isActive(item.href)
                    ? 'bg-white shadow-md'
                    : 'bg-white/30 hover:bg-white/60 hover:pl-5 hover:shadow-md'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {iconForKey(item.icon)}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile bottom nav — with icons */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-carto-blue-pale/40 z-40 safe-area-bottom">
          <nav className="flex items-center justify-around px-1 py-1.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 min-w-0 flex-1 text-center transition-colors ${
                  isActive(item.href)
                    ? 'text-[#4A90D9]'
                    : 'text-slate-400'
                }`}
              >
                <span className="flex items-center justify-center">
                  {iconForKey(item.icon, 'w-5 h-5')}
                </span>
                <span className="text-[9px] font-semibold leading-tight whitespace-nowrap truncate w-full">
                  {item.mobileLabel}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Page Content */}
        <main className="flex-1 md:ml-56 w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
