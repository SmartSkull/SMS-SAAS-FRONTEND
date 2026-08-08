'use client';
import { CAMPUS_CATEGORIES } from '@/types/campus';

interface CategoryFilterProps {
  active: Set<string>;
  onToggle: (key: string) => void;
}

export function CategoryFilter({ active, onToggle }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CAMPUS_CATEGORIES.map(c => {
        const isActive = !active.has(c.key);
        return (
          <button
            key={c.key}
            onClick={() => onToggle(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isActive
                ? 'bg-white shadow-sm border-gray-200 text-gray-700 hover:border-blue-300'
                : 'bg-gray-100 border-transparent text-gray-400'
            }`}
          >
            <span>{c.icon}</span> {c.label}
          </button>
        );
      })}
    </div>
  );
}
