import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { id: "layers", label: "Layers", placeholder: "Layer toggles and opacity (Task 28)." },
  { id: "analysis", label: "Analysis", placeholder: "Click a hex to see its metrics (Task 23)." },
  { id: "simulate", label: "Simulate", placeholder: "What-if simulator (Phase 6)." },
  { id: "methodology", label: "Method", placeholder: "Scoring formulas and data sources (Task 34)." },
] as const;

export function RightPanel() {
  return (
    <aside aria-label="Dashboard controls" className="flex min-h-0 flex-col border-l border-border bg-card">
      <Tabs defaultValue="layers" className="flex min-h-0 flex-1 flex-col p-3">
        <TabsList className="w-full">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="min-h-0 overflow-y-auto pt-3 text-sm text-muted-foreground">
            {t.placeholder}
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
}
