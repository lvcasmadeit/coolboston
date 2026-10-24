"use client";

import type { ComponentType } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  title?: string;
  Icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

/** Small segmented control: a labelled group of toggle buttons (aria-pressed), keyboard operable. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`flex gap-1 rounded-md border border-border bg-card p-1 text-xs ${className}`}>
      {options.map(({ value: v, label: l, title, Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          title={title}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1 rounded px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {Icon && <Icon className="size-3.5" aria-hidden />}
          {l}
        </button>
      ))}
    </div>
  );
}
