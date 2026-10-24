"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { BeforeAfterRow } from "@/lib/beforeAfter";

const BEFORE = "var(--muted-foreground)";
const AFTER = "rgb(33 113 181)"; // Change-mode blue

/**
 * Before and after, °F, one small chart per metric so each has its own scale. Bars start at 0,
 * so small changes look small; the labels carry the exact values.
 */
export function BeforeAfterChart({ rows, emptyText }: { rows: BeforeAfterRow[]; emptyText: string }) {
  return (
    <figure aria-label="Before and after" className="flex min-h-0 flex-col">
      <figcaption className="text-xs font-medium text-foreground">
        Before and after, °F (estimates){" "}
        <span className="font-normal text-muted-foreground">
          <span style={{ color: BEFORE }}>■</span> before <span style={{ color: AFTER }}>■</span> after
        </span>
      </figcaption>
      {rows.length === 0 ? (
        <p className="m-auto text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((r) => (
            <div key={r.key} className="flex min-h-0 flex-col" aria-label={`${r.label}: ${r.before.toFixed(2)} to ${r.after.toFixed(2)} °F`}>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: r.label, before: r.before, after: r.after }]} margin={{ top: 14, right: 4, bottom: 0, left: 4 }}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide domain={[Math.min(0, r.before, r.after), "auto"]} />
                    <Bar dataKey="before" fill={BEFORE} isAnimationActive={false}>
                      <LabelList dataKey="before" position="top" fontSize={10} formatter={(v: unknown) => Number(v).toFixed(1)} />
                    </Bar>
                    <Bar dataKey="after" fill={AFTER} isAnimationActive={false}>
                      <LabelList dataKey="after" position="top" fontSize={10} formatter={(v: unknown) => Number(v).toFixed(1)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[10px] leading-tight text-muted-foreground">
                {r.label} <span className="block">{r.note}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}
