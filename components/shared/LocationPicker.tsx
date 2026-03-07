'use client';

import { useState, useRef, useEffect } from 'react';
import { getAllLocations } from '@/lib/data-extraction';
import { STATE_CODES, STATE_NAMES, getStateFlagPath } from '@/lib/state-flags';

function getStateCodeForLocation(loc: { type: string; name: string; displayName: string }): string {
  if (loc.type === 'state') {
    return STATE_CODES[loc.name] || '';
  }
  const parts = loc.displayName.split(', ');
  return (parts[1] || '').trim();
}

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function LocationPicker({
  value,
  onChange,
  label,
  placeholder = 'Search states and cities...',
  className = '',
}: LocationPickerProps) {
  const [allLocations] = useState(getAllLocations());
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLocations = allLocations.filter(loc =>
    loc.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const states = filteredLocations.filter(l => l.type === 'state');
  const cities = filteredLocations.filter(l => l.type === 'city');

  const selectedLabel = (() => {
    if (!value) return '';
    const loc = allLocations.find(l => l.displayName === value);
    if (!loc) return value;
    if (loc.type === 'city') {
      const stateCode = getStateCodeForLocation(loc);
      return `${loc.name}${STATE_NAMES[stateCode] ? `, ${STATE_NAMES[stateCode]}` : ''}`;
    }
    return loc.displayName;
  })();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-[#6B7280] mb-1.5">{label}</label>
      )}

      {value && !isOpen ? (
        <div
          className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-between cursor-pointer hover:border-[#D1D5DB] transition-all"
          onClick={() => { setIsOpen(true); setSearchTerm(''); }}
        >
          <span className="text-[#2C3E50] font-medium">{selectedLabel}</span>
          <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#4A90D9] focus:ring-2 focus:ring-[#4A90D9] focus:ring-opacity-20 outline-none transition-all"
          autoFocus={isOpen}
        />
      )}

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 max-h-80 overflow-y-auto border border-[#E5E7EB] rounded-lg p-4 bg-white shadow-lg">
          {states.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2 px-2">
                States ({states.length})
              </div>
              <div className="space-y-1">
                {states.map(loc => {
                  const isSelected = loc.displayName === value;
                  return (
                    <button
                      key={loc.name}
                      onClick={() => {
                        onChange(loc.displayName);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all text-left ${
                        isSelected ? 'bg-[#EFF6FF] border border-[#4A90D9]' : 'border border-transparent hover:bg-[#F8FAFB]'
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-[#4A90D9]' : 'border-[#D1D5DB]'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-[#4A90D9]" />}
                        </div>
                        <span className="ml-3 font-medium text-[#2C3E50] text-sm">{loc.displayName}</span>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getStateFlagPath(loc.name)}
                        alt={`${loc.name} flag`}
                        className="w-8 h-6 object-cover rounded border border-[#E5E7EB] ml-2"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cities.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2 px-2">
                Major Cities ({cities.length})
              </div>
              <div className="space-y-1">
                {cities.map(loc => {
                  const isSelected = loc.displayName === value;
                  const stateCode = getStateCodeForLocation(loc);
                  return (
                    <button
                      key={loc.displayName}
                      onClick={() => {
                        onChange(loc.displayName);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all text-left ${
                        isSelected ? 'bg-[#EFF6FF] border border-[#4A90D9]' : 'border border-transparent hover:bg-[#F8FAFB]'
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-[#4A90D9]' : 'border-[#D1D5DB]'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-[#4A90D9]" />}
                        </div>
                        <span className="ml-3 font-medium text-[#2C3E50] text-sm">
                          {loc.name}{STATE_NAMES[stateCode] ? `, ${STATE_NAMES[stateCode]}` : ''}
                        </span>
                      </div>
                      {STATE_NAMES[stateCode] && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getStateFlagPath(STATE_NAMES[stateCode])}
                          alt={`${STATE_NAMES[stateCode]} flag`}
                          className="w-8 h-6 object-cover rounded border border-[#E5E7EB] ml-2"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredLocations.length === 0 && (
            <div className="text-center py-8 text-[#9CA3AF]">
              No locations found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
