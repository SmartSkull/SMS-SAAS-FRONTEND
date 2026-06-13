'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-blue-200">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between py-5 text-left gap-4">
        <span className="font-semibold text-gray-900 text-[15px]">{q}</span>
        <ChevronDown size={18} className="text-blue-500 shrink-0 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: open ? '200px' : '0px', opacity: open ? 1 : 0 }}>
        <p className="text-gray-500 text-sm leading-7 pb-5">{a}</p>
      </div>
    </div>
  );
}
