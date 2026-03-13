'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchLocations } from '@/lib/locations';

interface SearchResult {
  label: string;
  href: string;
  type: 'location' | 'page';
  description?: string;
}

const PAGES: SearchResult[] = [
  { label: 'Your Profile', href: '/profile', type: 'page', description: 'View and edit your profile' },
  { label: 'Debt Payoff', href: '/debt-payoff', type: 'page', description: 'Debt payoff calculator' },
  { label: 'My Locations', href: '/my-locations', type: 'page', description: 'Saved locations' },
  { label: 'Home Size Calculator', href: '/home-size-calculator', type: 'page', description: 'Calculate affordable home size' },
  { label: 'Rent vs Buy', href: '/rent-vs-buy', type: 'page', description: 'Compare renting vs buying' },
  { label: 'Home Affordability', href: '/home-affordability', type: 'page', description: 'Affordability heat map' },
  { label: 'Job Finder', href: '/job-finder', type: 'page', description: 'Find jobs by location' },
  { label: 'Wealth Generation', href: '/wealth-generation', type: 'page', description: 'Wealth projection tools' },
];

function encodeSlug(name: string): string {
  return encodeURIComponent(name.replace(/ /g, '-'));
}

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Search logic
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    const lower = q.toLowerCase();

    // Search pages
    const pageResults = PAGES.filter(p =>
      p.label.toLowerCase().includes(lower) ||
      (p.description && p.description.toLowerCase().includes(lower))
    );

    // Search locations
    const locationResults = searchLocations(q, 8).map(loc => ({
      label: loc.label,
      href: `/location/${encodeSlug(loc.label)}`,
      type: 'location' as const,
      description: loc.type === 'state' ? 'State' : 'City',
    }));

    setResults([...pageResults, ...locationResults]);
    setSelectedIndex(-1);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const navigate = useCallback((href: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(href);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].href);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search locations, pages..."
          className="w-full pl-9 pr-12 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/40 focus:border-[#4A90D9] transition-colors"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded">
          ⌘K
        </kbd>
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[100] max-h-80 overflow-y-auto">
          {results.map((result, i) => (
            <button
              key={result.href}
              onClick={() => navigate(result.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === selectedIndex ? 'bg-[#4A90D9]/10' : 'hover:bg-slate-50'
              }`}
            >
              {result.type === 'location' ? (
                <svg className="w-4 h-4 text-[#4A90D9] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{result.label}</p>
                {result.description && (
                  <p className="text-xs text-slate-400 truncate">{result.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[100]">
          <p className="px-4 py-6 text-sm text-slate-400 text-center">No results found</p>
        </div>
      )}
    </div>
  );
}
