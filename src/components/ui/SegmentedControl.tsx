'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** Pill-style segmented control with an animated active indicator. */
export default function SegmentedControl<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <span id={`${id}-label`} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="flex items-center gap-0.5 overflow-x-auto rounded-xl border border-sky-100 bg-sky-50/60 p-0.5"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              id={`${id}-${o.value}`}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.title}
              onClick={() => onChange(o.value)}
              className={`relative flex-1 whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'text-white' : 'text-slate-600 hover:text-sky-700 hover:bg-white/70'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`${id}-indicator`}
                  className="absolute inset-0 rounded-[10px] bg-gradient-to-r from-sky-600 to-sky-500 shadow-sm"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
