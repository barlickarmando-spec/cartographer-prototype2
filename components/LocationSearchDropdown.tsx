"use client";

import { useState, useRef, useEffect } from "react";
import { getStates, getCities } from "@/lib/data";

interface LocationSearchDropdownProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  multiple?: boolean;
}

export default function LocationSearchDropdown({
  selectedIds,
  onSelectionChange,
  multiple = true,
}: LocationSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const states = getStates();
  const cities = getCities();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStates = states.filter((s) =>
    s.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCities = cities.filter((c) =>
    c.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (id: string) => {
    if (multiple) {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((i) => i !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    } else {
      onSelectionChange([id]);
      setIsOpen(false);
    }
  };


  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        {selectedIds.length === 0
          ? "Select locations..."
          : `${selectedIds.length} location${selectedIds.length > 1 ? "s" : ""} selected`}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-96 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search locations..."
            className="w-full border-b border-slate-200 px-3 py-2 text-sm focus:outline-none"
            autoFocus
          />
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
              States
            </div>
            {filteredStates.map((state) => (
              <button
                key={state.value}
                type="button"
                onClick={() => handleToggle(`state:${state.value}`)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(`state:${state.value}`)}
                  onChange={() => {}}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <div className="h-4 w-6 flex-shrink-0 rounded bg-slate-200"></div>
                <span>{state.label}</span>
              </button>
            ))}
            <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
              Cities
            </div>
            {filteredCities.map((city) => (
              <button
                key={city.value}
                type="button"
                onClick={() => handleToggle(city.value)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(city.value)}
                  onChange={() => {}}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <div className="h-4 w-6 flex-shrink-0 rounded bg-slate-200"></div>
                <span>{city.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
