export function BottomPanel() {
  return (
    <section
      aria-label="Timeline and charts"
      className="grid min-h-0 grid-rows-[auto_1fr] gap-2 border-t border-border bg-card p-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Timeline</h2>
        <span className="text-xs text-muted-foreground">Summer 2013 – 2025</span>
      </div>
      <div className="grid min-h-0 grid-cols-2 gap-3">
        <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          Surface temperature by year (Task 22)
        </div>
        <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          Heat-island difference from city average (Task 23)
        </div>
      </div>
    </section>
  );
}
