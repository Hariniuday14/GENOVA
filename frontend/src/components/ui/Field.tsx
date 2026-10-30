import type { ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] text-rose-300" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export function Select({ options, className, ...props }: SelectProps) {
  return (
    <select className={cn("input appearance-none pr-9", className)} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-midnight-850">
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface RangeProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  display?: string;
}

export function Range({ id, value, min, max, step = 1, onChange, label, display }: RangeProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[12px] text-ink-muted">
          {label}
        </label>
        <span className="mono text-[12px] text-ink">{display ?? value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-midnight-600 accent-accent-cyan"
      />
    </div>
  );
}
