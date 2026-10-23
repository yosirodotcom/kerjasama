'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Styled native select with label and optional leading icon. */
export default function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  icon,
  disabled,
  className = '',
}: SelectFieldProps) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-600">
            {icon}
          </span>
        )}
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          title={options.find((o) => o.value === value)?.label}
          className={`w-full appearance-none truncate rounded-xl border bg-white py-2 pr-8 text-xs font-semibold text-slate-700 shadow-xs transition-all
            ${icon ? 'pl-8' : 'pl-3'}
            ${disabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              : 'cursor-pointer border-sky-100 hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20'}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-transform group-hover:text-sky-600" />
      </div>
    </div>
  );
}
