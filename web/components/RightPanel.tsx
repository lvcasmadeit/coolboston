import { LayersPanel } from "@/components/LayersPanel";
import { MetricsPanel } from "@/components/MetricsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { id: "metrics", label: "Metrics" },
  { id: "layers", label: "Layers" },
] as const;

/** Right pane: metrics and charts, map layers. */
export function RightPanel() {
  return (
    <aside aria-label="Dashboard controls" className="flex min-h-0 flex-col border-l border-border bg-background">
      <Tabs defaultValue="metrics" className="flex min-h-0 flex-1 flex-col p-3">
        <TabsList className="w-full">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="min-h-0 overflow-y-auto pt-3 text-sm text-muted-foreground">
            {t.id === "metrics" ? <MetricsPanel /> : <LayersPanel />}
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
}
